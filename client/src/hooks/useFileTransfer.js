import { useEffect, useRef, useCallback } from 'react';
import { socketClient } from '../services/socketClient.js';
import { WebRTCEngine } from '../services/webrtcEngine.js';
import { useTransferStore } from '../store/transferStore.js';
import { getDeviceInfo } from '../utils/deviceDetect.js';
import { getApiUrl, getAppBaseUrl } from '../utils/api.js';

const DEFAULT_ICE_SERVERS = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302',
      'stun:global.stun.twilio.com:3478'
    ]
  }
];

export function useFileTransfer() {
  const store = useTransferStore();
  const socketRef = useRef(null);
  const webrtcRef = useRef(null);
  const earlyCandidatesQueueRef = useRef([]);
  const iceServersRef = useRef(DEFAULT_ICE_SERVERS);

  // Synchronized refs to avoid stale closures in socket callbacks
  const filesRef = useRef(store.selectedFiles);
  filesRef.current = store.selectedFiles;

  const roomIdRef = useRef(store.roomId);
  roomIdRef.current = store.roomId;

  const statusRef = useRef(store.status);
  statusRef.current = store.status;

  const roleRef = useRef(store.role);
  roleRef.current = store.role;

  // Fetch ICE server config from backend (STUN + optional TURN for Coturn)
  useEffect(() => {
    fetch(getApiUrl('/api/config/ice'))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.iceServers && data.iceServers.length > 0) {
          iceServersRef.current = data.iceServers;
          console.log('[DropLink] Loaded ICE servers from signaling backend:', data.iceServers);
        }
      })
      .catch(err => {
        console.warn('[DropLink] Using fallback STUN servers, could not fetch /api/config/ice:', err);
      });
  }, []);

  /**
   * Helper to instantiate and wire WebRTCEngine
   */
  const initWebRTC = useCallback((isInitiator) => {
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }

    const socket = socketRef.current || socketClient.getSocket();

    const triggerSendFiles = () => {
      if (isInitiator && filesRef.current.length > 0) {
        console.log(`[WebRTC Hook] Triggering sendFiles for ${filesRef.current.length} file(s)`);
        engine.sendFiles(filesRef.current).catch(err => {
          console.error('[WebRTC] Error during file transmission:', err);
          store.setStatus('failed', 'Error occurred during file transfer');
        });
      }
    };

    const engine = new WebRTCEngine({
      iceServers: iceServersRef.current,
      onIceCandidate: (candidate) => {
        socket.emit('webrtc:ice-candidate', {
          roomId: roomIdRef.current,
          candidate
        });
      },
      onDataChannelOpen: (channel) => {
        console.log('[WebRTC Hook] DataChannel opened, ready for high-speed transmission');
        store.setStatus('transferring');
        triggerSendFiles();
      },
      onConnectionStateChange: (state) => {
        console.log('[WebRTC Hook] Peer connection state:', state);
        if (state === 'connected') {
          store.setStatus('transferring');
          triggerSendFiles();
        } else if (state === 'failed') {
          console.error('[WebRTC Hook] Peer connection failed.');
          store.setStatus('failed', 'WebRTC connection failed. Check your network or firewall.');
        } else if (state === 'disconnected') {
          if (statusRef.current === 'transferring') {
            store.setStatus('disconnected', 'Connection interrupted');
          }
        }
      },
      onProgress: (metrics) => {
        store.updateProgress(metrics);
      },
      onFileReceived: (fileItem) => {
        store.addReceivedFile(fileItem);
        store.addToast({
          type: 'success',
          title: 'File Received',
          message: `${fileItem.name} received successfully.`
        });
      },
      onTransferComplete: () => {
        store.setStatus('completed');
        store.addToast({
          type: 'success',
          title: 'Transfer Complete!',
          message: 'All files have been transferred securely.'
        });
      },
      onError: (err) => {
        console.error('[WebRTC Hook] Engine error:', err);
        store.setStatus('failed', err?.message || 'Transfer error');
      },
      onCancel: (reason) => {
        store.setStatus('cancelled', reason);
      }
    });

    webrtcRef.current = engine;

    // Drain any candidates that arrived over socket before engine instantiation
    if (earlyCandidatesQueueRef.current.length > 0) {
      console.log(`[WebRTC Hook] Draining ${earlyCandidatesQueueRef.current.length} buffered early socket candidate(s)`);
      while (earlyCandidatesQueueRef.current.length > 0) {
        const c = earlyCandidatesQueueRef.current.shift();
        engine.addIceCandidate(c);
      }
    }

    return engine;
  }, [store]);

  // Initialize Socket.io connection and listeners
  useEffect(() => {
    const socket = socketClient.connect();
    socketRef.current = socket;

    // Receiver joined notification (received by Sender)
    socket.on('receiver:joined', ({ receiverSocketId, deviceInfo }) => {
      console.log('[Socket] Receiver joined:', receiverSocketId, deviceInfo);
      store.setPeerDevice(deviceInfo);
      store.setStatus('paired');
      store.addToast({
        type: 'info',
        title: 'Device Connected',
        message: `${deviceInfo?.label || 'Receiver'} joined the room.`
      });

      // Automatically offer files to receiver
      const files = filesRef.current;
      if (files.length > 0) {
        store.setStatus('requesting');
        socket.emit('transfer:metadata', {
          roomId: roomIdRef.current,
          files: files.map(f => ({ name: f.name, size: f.size, type: f.type, lastModified: f.lastModified }))
        });
      }
    });

    // Incoming file transfer request (received by Receiver)
    socket.on('transfer:incoming', ({ senderDevice, files, totalSize }) => {
      console.log('[Socket] Incoming transfer offer:', files.length, 'files');
      store.setPeerDevice(senderDevice);
      store.setIncomingFiles(files, totalSize);
      store.setStatus('prompting'); // Waiting for receiver consent
    });

    // Receiver's decision (received by Sender)
    socket.on('transfer:decision', async ({ accepted, reason }) => {
      console.log('[Socket] Receiver decision:', accepted ? 'ACCEPTED' : 'DECLINED');
      if (accepted) {
        store.setStatus('connecting');
        store.addToast({
          type: 'success',
          title: 'Transfer Accepted',
          message: 'Establishing direct peer connection...'
        });

        // Initialize WebRTC as Initiator
        try {
          const webrtc = initWebRTC(true);
          const offer = await webrtc.createOffer();
          socket.emit('webrtc:offer', { roomId: roomIdRef.current, sdp: offer });
        } catch (err) {
          console.error('[WebRTC] Failed to create WebRTC offer:', err);
          store.setStatus('failed', 'Failed to initialize peer connection');
        }
      } else {
        store.setStatus('cancelled');
        store.addToast({
          type: 'warning',
          title: 'Transfer Declined',
          message: reason || 'The receiver declined the transfer request.'
        });
      }
    });

    // WebRTC Offer received (by Receiver)
    socket.on('webrtc:offer', async ({ sdp }) => {
      console.log('[Socket] Received WebRTC SDP offer. Generating answer...');
      try {
        store.setStatus('connecting');
        const webrtc = initWebRTC(false);
        const answer = await webrtc.createAnswer(sdp);
        socket.emit('webrtc:answer', { roomId: roomIdRef.current, sdp: answer });
      } catch (err) {
        console.error('[WebRTC] Failed to handle WebRTC offer:', err);
        store.setStatus('failed', 'Failed to connect with sender');
      }
    });

    // WebRTC Answer received (by Sender)
    socket.on('webrtc:answer', async ({ sdp }) => {
      console.log('[Socket] Received WebRTC SDP answer. Applying to connection...');
      try {
        if (webrtcRef.current) {
          await webrtcRef.current.handleAnswer(sdp);
        } else {
          console.warn('[WebRTC] webrtcRef.current is null when answer arrived');
        }
      } catch (err) {
        console.error('[WebRTC] Failed to handle WebRTC answer:', err);
      }
    });

    // WebRTC ICE Candidate received
    socket.on('webrtc:ice-candidate', async ({ candidate }) => {
      try {
        if (webrtcRef.current) {
          await webrtcRef.current.addIceCandidate(candidate);
        } else {
          console.log('[Socket] Buffering incoming ICE candidate (engine not yet initialized)');
          earlyCandidatesQueueRef.current.push(candidate);
        }
      } catch (err) {
        console.error('[WebRTC] Failed to add ICE candidate:', err);
      }
    });

    // Peer disconnected
    socket.on('peer:disconnected', ({ role, message }) => {
      console.log('[Socket] Peer disconnected:', role, message);
      store.setStatus('disconnected', message);
      store.addToast({
        type: 'warning',
        title: 'Peer Disconnected',
        message: message || 'The other device has left the transfer.'
      });
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }
    });

    // Handle connection errors gracefully
    socket.on('connect_error', (err) => {
      console.warn('[DropLink Socket] Connection error:', err.message);
      if (statusRef.current === 'creating' || statusRef.current === 'connecting') {
        store.setStatus('failed', 'Cannot connect to signaling server. If Render backend was idle, it may be waking up (please retry).');
      }
    });

    return () => {
      socket.off('receiver:joined');
      socket.off('transfer:incoming');
      socket.off('transfer:decision');
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('peer:disconnected');
      socket.off('connect_error');
    };
  }, [initWebRTC, store]);

  /**
   * SENDER: Create a new room with selected files
   */
  const createRoom = useCallback(async () => {
    if (filesRef.current.length === 0) {
      store.addToast({
        type: 'error',
        title: 'No Files Selected',
        message: 'Please choose at least one file to send.'
      });
      return;
    }

    store.setRole('sender');
    store.setStatus('creating');
    const socket = socketRef.current || socketClient.connect();
    const deviceInfo = getDeviceInfo();

    let responded = false;
    const timeoutTimer = setTimeout(() => {
      if (!responded) {
        responded = true;
        store.setStatus('failed', 'Signaling server took too long to respond. The Render free-tier backend may be waking up from sleep. Please retry in 10-15 seconds.');
        store.addToast({
          type: 'warning',
          title: 'Signaling Server Delayed',
          message: 'Backend instance is waking up from sleep. Please try again in 10 seconds.'
        });
      }
    }, 12000);

    socket.emit('room:create', { deviceInfo }, (response) => {
      if (responded) return;
      responded = true;
      clearTimeout(timeoutTimer);

      if (response && response.success) {
        const fullUrl = `${getAppBaseUrl()}/?room=${response.roomId}`;
        store.setRole('sender');
        store.setRoom({
          roomId: response.roomId,
          roomUrl: fullUrl,
          expiresAt: response.expiresAt
        });
        store.setStatus('waiting');
      } else {
        store.setStatus('failed', response?.error || 'Failed to create room');
      }
    });
  }, [store]);

  /**
   * RECEIVER: Join an existing room via URL/ID
   */
  const joinRoom = useCallback(async (roomId) => {
    if (!roomId) return;

    store.setRole('receiver');
    store.setStatus('connecting');
    const socket = socketRef.current || socketClient.connect();
    const deviceInfo = getDeviceInfo();

    let responded = false;
    const timeoutTimer = setTimeout(() => {
      if (!responded) {
        responded = true;
        store.setStatus('failed', 'Signaling server took too long to connect. Please refresh to retry.');
      }
    }, 12000);

    socket.emit('room:join', { roomId, deviceInfo }, (response) => {
      if (responded) return;
      responded = true;
      clearTimeout(timeoutTimer);

      if (response && response.success) {
        const fullUrl = `${getAppBaseUrl()}/?room=${roomId}`;
        store.setRoom({
          roomId,
          roomUrl: fullUrl,
          expiresAt: null
        });

        if (response.senderDevice) {
          store.setPeerDevice(response.senderDevice);
        }

        // If files already present
        if (response.files && response.files.length > 0) {
          const totalSize = response.files.reduce((a, b) => a + b.size, 0);
          store.setIncomingFiles(response.files, totalSize);
          store.setStatus('prompting');
        } else {
          store.setStatus('paired');
        }
      } else {
        store.setStatus('failed', response?.message || response?.error || 'Room not found or expired');
      }
    });
  }, [store]);

  /**
   * RECEIVER: Accept incoming file transfer
   */
  const acceptTransfer = useCallback(() => {
    const socket = socketRef.current || socketClient.getSocket();
    if (!socket || !roomIdRef.current) return;

    socket.emit('transfer:decision', {
      roomId: roomIdRef.current,
      accepted: true
    });
    store.setStatus('connecting');
  }, [store]);

  /**
   * RECEIVER: Reject incoming file transfer
   */
  const rejectTransfer = useCallback((reason = 'Transfer declined by receiver') => {
    const socket = socketRef.current || socketClient.getSocket();
    if (!socket || !roomIdRef.current) return;

    socket.emit('transfer:decision', {
      roomId: roomIdRef.current,
      accepted: false,
      reason
    });
    store.setStatus('cancelled', reason);
  }, [store]);

  /**
   * Cancel active transfer
   */
  const cancelTransfer = useCallback(() => {
    if (webrtcRef.current) {
      webrtcRef.current.cancelTransfer('Transfer cancelled by user');
    }
    const socket = socketRef.current || socketClient.getSocket();
    if (socket && roomIdRef.current) {
      socket.emit('transfer:status', {
        roomId: roomIdRef.current,
        status: 'cancelled',
        message: 'Transfer cancelled by user'
      });
    }
    store.setStatus('cancelled');
  }, [store]);

  /**
   * Download a single received file
   */
  const downloadFile = useCallback((fileItem) => {
    if (!fileItem || !fileItem.url) return;
    const a = document.createElement('a');
    a.href = fileItem.url;
    a.download = fileItem.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  /**
   * Download all received files
   */
  const downloadAllFiles = useCallback(() => {
    store.receivedFiles.forEach((file, index) => {
      setTimeout(() => {
        downloadFile(file);
      }, index * 250); // slight stagger to allow browser download pipeline
    });
  }, [store.receivedFiles, downloadFile]);

  /**
   * Reset the whole transfer flow to start fresh
   */
  const resetTransfer = useCallback(() => {
    earlyCandidatesQueueRef.current = [];
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
      webrtcRef.current = null;
    }
    const socket = socketRef.current || socketClient.getSocket();
    if (socket && roomIdRef.current) {
      socket.emit('room:leave', { roomId: roomIdRef.current });
    }
    // Clean URL query param if present
    if (typeof window !== 'undefined' && window.history.pushState) {
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
    store.resetTransfer();
  }, [store]);

  return {
    ...store,
    createRoom,
    joinRoom,
    acceptTransfer,
    rejectTransfer,
    cancelTransfer,
    downloadFile,
    downloadAllFiles,
    resetTransfer
  };
}
