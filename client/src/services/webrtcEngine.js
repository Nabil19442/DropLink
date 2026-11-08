/**
 * DropLink WebRTC Peer-to-Peer Data Transfer Engine
 * Handles RTCPeerConnection, RTCDataChannel, binary chunking, backpressure, and file reassembly.
 */

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks
const BUFFER_MAX_THRESHOLD = 1024 * 1024; // 1 MB backpressure limit
const BUFFER_LOW_THRESHOLD = 256 * 1024; // 256 KB drain threshold

export class WebRTCEngine {
  constructor({
    iceServers = [{ urls: 'stun:stun.l.google.com:19302' }],
    onIceCandidate,
    onConnectionStateChange,
    onProgress,
    onFileReceived,
    onTransferComplete,
    onError,
    onCancel
  } = {}) {
    this.iceServers = iceServers;
    this.onIceCandidate = onIceCandidate;
    this.onConnectionStateChange = onConnectionStateChange;
    this.onProgress = onProgress;
    this.onFileReceived = onFileReceived;
    this.onTransferComplete = onTransferComplete;
    this.onError = onError;
    this.onCancel = onCancel;

    this.peerConnection = null;
    this.dataChannel = null;
    this.isInitiator = false;
    this.isCancelled = false;

    // Receiver state
    this.currentReceivingFile = null;
    this.receivedChunks = [];
    this.receivedBytesCurrentFile = 0;
    this.totalTransferredBytes = 0;
    this.totalTransferBytes = 0;

    // Metrics tracking
    this.lastSpeedCheckTime = Date.now();
    this.lastTransferredBytes = 0;
    this.smoothedSpeed = 0;
  }

  /**
   * Initializes RTCPeerConnection
   */
  initPeerConnection() {
    this.cleanup();
    this.isCancelled = false;

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      if (iceState === 'failed') {
        this.peerConnection?.restartIce?.();
      }
    };
  }

  /**
   * SENDER: Creates WebRTC offer and DataChannel
   */
  async createOffer() {
    this.isInitiator = true;
    this.initPeerConnection();

    // Create DataChannel with reliable delivery
    this.dataChannel = this.peerConnection.createDataChannel('droplink-file-transfer', {
      ordered: true
    });
    this.dataChannel.binaryType = 'arraybuffer';
    this.setupDataChannelEvents(this.dataChannel);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    return offer;
  }

  /**
   * RECEIVER: Creates WebRTC answer to an incoming offer
   */
  async createAnswer(offerSdp) {
    this.isInitiator = false;
    this.initPeerConnection();

    // Listen for incoming DataChannel
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.dataChannel.binaryType = 'arraybuffer';
      this.setupDataChannelEvents(this.dataChannel);
    };

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    return answer;
  }

  /**
   * SENDER: Receives answer from receiver
   */
  async handleAnswer(answerSdp) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
  }

  /**
   * Handles incoming ICE candidate
   */
  async addIceCandidate(candidate) {
    if (!this.peerConnection || !candidate) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[WebRTC] ICE candidate error:', err);
    }
  }

  /**
   * Wire DataChannel event listeners
   */
  setupDataChannelEvents(channel) {
    channel.onopen = () => {
      console.log('[WebRTC] DataChannel opened');
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('connected');
      }
    };

    channel.onclose = () => {
      console.log('[WebRTC] DataChannel closed');
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('disconnected');
      }
    };

    channel.onerror = (err) => {
      console.error('[WebRTC] DataChannel error:', err);
      if (this.onError) this.onError(err);
    };

    channel.onmessage = (event) => {
      this.handleIncomingData(event.data);
    };
  }

  /**
   * RECEIVER: Handle incoming chunk or control message
   */
  handleIncomingData(data) {
    if (this.isCancelled) return;

    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        this.handleControlMessage(msg);
      } catch (e) {
        console.error('[WebRTC] Failed to parse control message', e);
      }
      return;
    }

    // Binary ArrayBuffer chunk received
    if (data instanceof ArrayBuffer && this.currentReceivingFile) {
      this.receivedChunks.push(data);
      this.receivedBytesCurrentFile += data.byteLength;
      this.totalTransferredBytes += data.byteLength;

      this.updateTransferMetrics(this.currentReceivingFile.name, this.receivedBytesCurrentFile, this.currentReceivingFile.size);
    }
  }

  /**
   * Handle JSON control messages on DataChannel
   */
  handleControlMessage(msg) {
    switch (msg.type) {
      case 'transfer_init':
        this.totalTransferBytes = msg.totalBytes;
        this.totalTransferredBytes = 0;
        this.lastSpeedCheckTime = Date.now();
        this.lastTransferredBytes = 0;
        break;

      case 'file_start':
        this.currentReceivingFile = {
          id: msg.id,
          name: msg.name,
          size: msg.size,
          mimeType: msg.mimeType,
          totalChunks: msg.totalChunks,
          fileIndex: msg.fileIndex,
          totalFiles: msg.totalFiles
        };
        this.receivedChunks = [];
        this.receivedBytesCurrentFile = 0;
        break;

      case 'file_end':
        if (this.currentReceivingFile) {
          const blob = new Blob(this.receivedChunks, {
            type: this.currentReceivingFile.mimeType || 'application/octet-stream'
          });
          const url = URL.createObjectURL(blob);

          if (this.onFileReceived) {
            this.onFileReceived({
              id: this.currentReceivingFile.id,
              name: this.currentReceivingFile.name,
              size: this.currentReceivingFile.size,
              type: this.currentReceivingFile.mimeType,
              blob,
              url
            });
          }

          this.receivedChunks = [];
          this.currentReceivingFile = null;
        }
        break;

      case 'all_complete':
        if (this.onTransferComplete) {
          this.onTransferComplete();
        }
        break;

      case 'transfer_cancel':
        this.isCancelled = true;
        if (this.onCancel) {
          this.onCancel(msg.reason || 'Transfer cancelled by peer');
        }
        break;

      default:
        console.log('[WebRTC] Unknown message:', msg);
    }
  }

  /**
   * SENDER: Stream all selected files via DataChannel with backpressure
   */
  async sendFiles(files) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('DataChannel is not ready for transfer');
    }

    this.isCancelled = false;
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    this.totalTransferBytes = totalBytes;
    this.totalTransferredBytes = 0;
    this.lastSpeedCheckTime = Date.now();
    this.lastTransferredBytes = 0;

    // Send transfer initiation header
    this.sendControlMessage({
      type: 'transfer_init',
      totalFiles: files.length,
      totalBytes
    });

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled) break;
      const file = files[i];

      await this.sendFileChunks(file, i, files.length);
    }

    if (!this.isCancelled) {
      this.sendControlMessage({ type: 'all_complete' });
      if (this.onTransferComplete) {
        this.onTransferComplete();
      }
    }
  }

  /**
   * SENDER: Chunk and stream a single file
   */
  async sendFileChunks(file, fileIndex, totalFiles) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Notify receiver of file start
    this.sendControlMessage({
      type: 'file_start',
      id: `${fileIndex}-${file.name}`,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      totalChunks,
      fileIndex,
      totalFiles
    });

    let offset = 0;
    let fileTransferredBytes = 0;

    while (offset < file.size) {
      if (this.isCancelled) break;

      // Backpressure Check: wait if buffer exceeds threshold
      if (this.dataChannel.bufferedAmount > BUFFER_MAX_THRESHOLD) {
        await this.waitForBufferDrain();
      }

      const chunkSlice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await chunkSlice.arrayBuffer();

      this.dataChannel.send(buffer);

      offset += buffer.byteLength;
      fileTransferredBytes += buffer.byteLength;
      this.totalTransferredBytes += buffer.byteLength;

      this.updateTransferMetrics(file.name, fileTransferredBytes, file.size, fileIndex);

      // Yield event loop briefly to keep UI responsive
      if (offset % (CHUNK_SIZE * 8) === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    if (!this.isCancelled) {
      this.sendControlMessage({
        type: 'file_end',
        fileIndex,
        name: file.name
      });
    }
  }

  /**
   * Backpressure helper: await bufferedamountlow
   */
  waitForBufferDrain() {
    return new Promise((resolve) => {
      this.dataChannel.bufferedAmountLowThreshold = BUFFER_LOW_THRESHOLD;
      const onLow = () => {
        this.dataChannel.removeEventListener('bufferedamountlow', onLow);
        resolve();
      };
      this.dataChannel.addEventListener('bufferedamountlow', onLow);
    });
  }

  /**
   * Send JSON control string over DataChannel
   */
  sendControlMessage(msg) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(msg));
    }
  }

  /**
   * Speed and ETA calculation with Exponential Moving Average
   */
  updateTransferMetrics(fileName, fileBytes, fileTotal, fileIndex = 0) {
    const now = Date.now();
    const timeDelta = (now - this.lastSpeedCheckTime) / 1000;

    if (timeDelta >= 0.4 || this.totalTransferredBytes === this.totalTransferBytes) {
      const bytesDelta = this.totalTransferredBytes - this.lastTransferredBytes;
      const instantSpeed = timeDelta > 0 ? bytesDelta / timeDelta : 0;

      // EMA smoothing
      this.smoothedSpeed = this.smoothedSpeed === 0 ? instantSpeed : this.smoothedSpeed * 0.6 + instantSpeed * 0.4;

      const remainingBytes = Math.max(0, this.totalTransferBytes - this.totalTransferredBytes);
      const etaSeconds = this.smoothedSpeed > 0 ? remainingBytes / this.smoothedSpeed : 0;

      this.lastSpeedCheckTime = now;
      this.lastTransferredBytes = this.totalTransferredBytes;

      if (this.onProgress) {
        this.onProgress({
          transferredBytes: this.totalTransferredBytes,
          totalBytes: this.totalTransferBytes,
          currentSpeed: Math.round(this.smoothedSpeed),
          estimatedSecondsRemaining: Math.round(etaSeconds),
          currentFileName: fileName,
          currentFileBytes: fileBytes,
          currentFileTotalBytes: fileTotal,
          currentFileIndex: fileIndex,
          fileProgress: {
            [fileName]: {
              bytes: fileBytes,
              total: fileTotal,
              percent: fileTotal > 0 ? Math.round((fileBytes / fileTotal) * 100) : 100
            }
          }
        });
      }
    }
  }

  /**
   * Cancel ongoing transfer
   */
  cancelTransfer(reason = 'User cancelled transfer') {
    this.isCancelled = true;
    this.sendControlMessage({ type: 'transfer_cancel', reason });
    if (this.onCancel) {
      this.onCancel(reason);
    }
    this.cleanup();
  }

  /**
   * Release and cleanup all WebRTC resources
   */
  cleanup() {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch (e) { /* ignore */ }
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) { /* ignore */ }
      this.peerConnection = null;
    }

    this.currentReceivingFile = null;
    this.receivedChunks = [];
  }
}

