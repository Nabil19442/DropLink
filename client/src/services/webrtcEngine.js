/**
 * DropLink WebRTC Peer-to-Peer Data Transfer Engine
 * Production-hardened with ICE Candidate Queuing, DataChannel Synchronization,
 * Backpressure Flow Control, and Structured Network Diagnostics.
 */

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks
const BUFFER_MAX_THRESHOLD = 1024 * 1024; // 1 MB backpressure limit
const BUFFER_LOW_THRESHOLD = 256 * 1024; // 256 KB drain threshold

export class WebRTCEngine {
  constructor({
    iceServers = [{ urls: 'stun:stun.l.google.com:19302' }],
    onIceCandidate,
    onConnectionStateChange,
    onDataChannelOpen,
    onProgress,
    onFileReceived,
    onTransferComplete,
    onError,
    onCancel
  } = {}) {
    this.iceServers = iceServers;
    this.onIceCandidate = onIceCandidate;
    this.onConnectionStateChange = onConnectionStateChange;
    this.onDataChannelOpen = onDataChannelOpen;
    this.onProgress = onProgress;
    this.onFileReceived = onFileReceived;
    this.onTransferComplete = onTransferComplete;
    this.onError = onError;
    this.onCancel = onCancel;

    this.peerConnection = null;
    this.dataChannel = null;
    this.isInitiator = false;
    this.isCancelled = false;
    this.isSending = false;

    // ICE Candidate Queue: Buffers candidates that arrive before remote description is applied
    this.pendingCandidates = [];

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
   * Initializes RTCPeerConnection with diagnostic lifecycle listeners
   */
  initPeerConnection() {
    this.cleanup();
    this.isCancelled = false;
    this.pendingCandidates = [];

    console.log('[WEBRTC] Initializing RTCPeerConnection with ICE servers:', this.iceServers);

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10
    });

    // Local ICE candidate generated
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const type = event.candidate.candidate?.split(' ')[7] || 'unknown';
        console.log(`[WEBRTC] Local ICE candidate gathered (type: ${type})`);
        if (this.onIceCandidate) {
          this.onIceCandidate(event.candidate);
        }
      } else {
        console.log('[WEBRTC] Local ICE candidate gathering complete (null candidate)');
      }
    };

    // Connection state monitor
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log(`[WEBRTC] Peer connectionState changed to: ${state}`);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    // ICE connection state monitor
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      console.log(`[WEBRTC] ICE connectionState changed to: ${iceState}`);

      if (iceState === 'failed') {
        console.warn('[WEBRTC] ICE connection state is failed. Attempting ICE restart if supported.');
        if (this.peerConnection && typeof this.peerConnection.restartIce === 'function') {
          try {
            this.peerConnection.restartIce();
          } catch (e) {
            console.warn('[WEBRTC] restartIce failed:', e);
          }
        }
      }
    };

    // ICE gathering state monitor
    this.peerConnection.onicegatheringstatechange = () => {
      console.log(`[WEBRTC] ICE gatheringState: ${this.peerConnection?.iceGatheringState}`);
    };

    // Signaling state monitor
    this.peerConnection.onsignalingstatechange = () => {
      console.log(`[WEBRTC] Signaling state: ${this.peerConnection?.signalingState}`);
    };
  }

  /**
   * SENDER: Creates WebRTC offer and initializes reliable DataChannel
   */
  async createOffer() {
    this.isInitiator = true;
    this.initPeerConnection();

    console.log('[WEBRTC] SENDER: Creating DataChannel "droplink-file-transfer"');
    this.dataChannel = this.peerConnection.createDataChannel('droplink-file-transfer', {
      ordered: true
    });
    this.dataChannel.binaryType = 'arraybuffer';
    this.setupDataChannelEvents(this.dataChannel);

    console.log('[WEBRTC] SENDER: Generating SDP Offer');
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    console.log('[WEBRTC] SENDER: Local description set (offer)');

    return offer;
  }

  /**
   * RECEIVER: Creates WebRTC answer to an incoming offer
   */
  async createAnswer(offerSdp) {
    this.isInitiator = false;
    this.initPeerConnection();

    // Receiver listens for incoming DataChannel from sender
    this.peerConnection.ondatachannel = (event) => {
      console.log('[WEBRTC] RECEIVER: ondatachannel received channel');
      this.dataChannel = event.channel;
      this.dataChannel.binaryType = 'arraybuffer';
      this.setupDataChannelEvents(this.dataChannel);
    };

    console.log('[WEBRTC] RECEIVER: Setting remote description (offer)');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));

    // Drain any candidates that arrived while remote description was being prepared
    await this.drainPendingCandidates();

    console.log('[WEBRTC] RECEIVER: Generating SDP Answer');
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log('[WEBRTC] RECEIVER: Local description set (answer)');

    return answer;
  }

  /**
   * SENDER: Receives and applies answer from receiver
   */
  async handleAnswer(answerSdp) {
    if (!this.peerConnection) return;
    console.log('[WEBRTC] SENDER: Setting remote description (answer)');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));

    // Drain any candidates that arrived while waiting for answer
    await this.drainPendingCandidates();
  }

  /**
   * Robust ICE candidate ingestion with queue buffering
   */
  async addIceCandidate(candidate) {
    if (!candidate) return;

    // Buffer candidate if remoteDescription has not yet been set
    if (
      !this.peerConnection ||
      !this.peerConnection.remoteDescription ||
      !this.peerConnection.remoteDescription.type
    ) {
      const type = candidate.candidate?.split(' ')[7] || 'unknown';
      console.log(`[WEBRTC] Buffering incoming ICE candidate (type: ${type}, waiting for remoteDescription)`);
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      const type = candidate.candidate?.split(' ')[7] || 'unknown';
      const iceCandidate = typeof RTCIceCandidate !== 'undefined' ? new RTCIceCandidate(candidate) : candidate;
      await this.peerConnection.addIceCandidate(iceCandidate);
      console.log(`[WEBRTC] Applied incoming ICE candidate (type: ${type})`);
    } catch (err) {
      console.warn('[WEBRTC] Error applying ICE candidate:', err?.message || err);
    }
  }

  /**
   * Drains all buffered ICE candidates after setRemoteDescription completes
   */
  async drainPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;

    const count = this.pendingCandidates.length;
    if (count > 0) {
      console.log(`[WEBRTC] Draining ${count} buffered ICE candidate(s)...`);
      while (this.pendingCandidates.length > 0) {
        const candidate = this.pendingCandidates.shift();
        try {
          const type = candidate.candidate?.split(' ')[7] || 'unknown';
          const iceCandidate = typeof RTCIceCandidate !== 'undefined' ? new RTCIceCandidate(candidate) : candidate;
          await this.peerConnection.addIceCandidate(iceCandidate);
          console.log(`[WEBRTC] Applied buffered ICE candidate (type: ${type})`);
        } catch (err) {
          console.warn('[WEBRTC] Error applying buffered ICE candidate:', err?.message || err);
        }
      }
    }
  }

  /**
   * Wire DataChannel event listeners with synchronization
   */
  setupDataChannelEvents(channel) {
    channel.onopen = () => {
      console.log('[WEBRTC] DataChannel is now OPEN and synchronized');
      if (this.onDataChannelOpen) {
        this.onDataChannelOpen();
      }
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('connected');
      }
    };

    channel.onclose = () => {
      console.log('[WEBRTC] DataChannel closed');
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('disconnected');
      }
    };

    channel.onerror = (err) => {
      console.error('[WEBRTC] DataChannel error:', err);
      if (this.onError) this.onError(err);
    };

    channel.onmessage = (event) => {
      this.handleIncomingData(event.data);
    };
  }

  /**
   * Awaits DataChannel readyState === 'open' before sending chunks
   */
  async waitForDataChannelOpen(timeoutMs = 15000) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      return;
    }

    if (!this.dataChannel || this.dataChannel.readyState === 'closed') {
      throw new Error('DataChannel is not available or is already closed');
    }

    console.log(`[WEBRTC] Awaiting DataChannel readyState to open (current: ${this.dataChannel.readyState})...`);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timed out waiting for DataChannel to open'));
      }, timeoutMs);

      const onOpen = () => {
        cleanup();
        console.log('[WEBRTC] DataChannel readyState transition to OPEN completed');
        resolve();
      };

      const onError = (e) => {
        cleanup();
        reject(new Error('DataChannel encountered error while opening: ' + (e?.message || 'unknown')));
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.dataChannel?.removeEventListener('open', onOpen);
        this.dataChannel?.removeEventListener('error', onError);
      };

      this.dataChannel.addEventListener('open', onOpen);
      this.dataChannel.addEventListener('error', onError);
    });
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
        console.error('[WEBRTC] Failed to parse control message', e);
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
        console.log(`[TRANSFER] Initialized transfer: ${msg.totalFiles} file(s), ${msg.totalBytes} bytes`);
        this.totalTransferBytes = msg.totalBytes;
        this.totalTransferredBytes = 0;
        this.lastSpeedCheckTime = Date.now();
        this.lastTransferredBytes = 0;
        break;

      case 'file_start':
        console.log(`[TRANSFER] File incoming: ${msg.name} (${msg.size} bytes, ${msg.totalChunks} chunks)`);
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
          console.log(`[TRANSFER] File complete: ${this.currentReceivingFile.name}. Reconstructing Blob...`);
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
        console.log('[TRANSFER] All files received successfully');
        if (this.onTransferComplete) {
          this.onTransferComplete();
        }
        break;

      case 'transfer_cancel':
        console.warn('[TRANSFER] Transfer cancelled by peer:', msg.reason);
        this.isCancelled = true;
        if (this.onCancel) {
          this.onCancel(msg.reason || 'Transfer cancelled by peer');
        }
        break;

      default:
        console.log('[WEBRTC] Unknown message type:', msg);
    }
  }

  /**
   * SENDER: Stream all selected files via DataChannel with backpressure flow control
   */
  async sendFiles(files) {
    if (this.isSending) {
      console.warn('[TRANSFER] sendFiles called while already sending. Ignoring duplicate call.');
      return;
    }

    this.isSending = true;
    this.isCancelled = false;

    try {
      // Ensure DataChannel is truly OPEN before streaming
      await this.waitForDataChannelOpen();

      const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
      this.totalTransferBytes = totalBytes;
      this.totalTransferredBytes = 0;
      this.lastSpeedCheckTime = Date.now();
      this.lastTransferredBytes = 0;

      console.log(`[TRANSFER] SENDER: Beginning transmission of ${files.length} file(s), total ${totalBytes} bytes`);

      // Send transfer initialization control header
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
        console.log('[TRANSFER] SENDER: Completed sending all files');
        if (this.onTransferComplete) {
          this.onTransferComplete();
        }
      }
    } finally {
      this.isSending = false;
    }
  }

  /**
   * SENDER: Chunk and stream a single file with backpressure drain monitoring
   */
  async sendFileChunks(file, fileIndex, totalFiles) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    console.log(`[TRANSFER] Sending file ${fileIndex + 1}/${totalFiles}: "${file.name}" (${file.size} bytes in ${totalChunks} chunks)`);

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

      // Yield event loop briefly to maintain UI responsiveness
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
   * Backpressure helper: waits for bufferedamountlow event
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
    this.isSending = false;
    this.pendingCandidates = [];

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
