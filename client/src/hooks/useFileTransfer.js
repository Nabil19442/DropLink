import { useEffect, useRef, useCallback } from 'react';
import { socketClient } from '../services/socketClient.js';
import { WebRTCEngine } from '../services/webrtcEngine.js';
import { useTransferStore } from '../store/transferStore.js';
import { getDeviceInfo } from '../utils/deviceDetect.js';

export function useFileTransfer() {
  const store = useTransferStore();
  const socketRef = useRef(null);
  const webrtcRef = useRef(null);
  const iceServersRef = useRef([
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ]);

  // Fetch ICE server config from backend
  useEffect(() => {
    fetch('/api/config/ice')
      .then(res => res.json())
      .then(data => {
        if (data.iceServers && data.iceServers.length > 0) {
          iceServersRef.current = data.iceServers;
        }
      })
      .catch(err => {
        console.warn('Using default STUN servers, could not fetch /api/config/ice:', err);
      });
  }, []);

  // Initialize Socket.io connection and listeners
  useEffect(() => {
    const socket = socketClient.connect();
    socketRef.current = socket;

    // Receiver joined notification (received by Sender)
    socket.on('receiver:joined', ({ receiverSocketId, deviceInfo }) => {
      store.setPeerDevice(deviceInfo);
      store.setStatus('paired');
      store.addToast({
        type: 'info',
        title: 'Device Connected',
        message: `${deviceInfo?.label || 'Receiver'} joined the room.`
      });

      // Automatically offer files to receiver
      const files = store.selectedFiles;
      if (files.length > 0) {
        store.setStatus('requesting');
        socket.emit('transfer:metadata', {
          roomId: store.roomId,
          files: files.map(f => ({ name: f.name, size: f.size, type: f.type, lastModified: f.lastModified }))
        });
      }
    });

    // Incoming file transfer request (received by Receiver)
    socket.on('transfer:incoming', ({ senderDevice, files, totalSize }) => {
      store.setPeerDevice(senderDevice);
      store.setIncomingFiles(files, totalSize);
      store.setStatus('prompting'); // Waiting for receiver consent
    });

    // Receiver's decision (received by Sender)
    socket.on('transfer:decision', async ({ accepted, reason }) => {
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
          socket.emit('webrtc:offer', { roomId: store.roomId, sdp: offer });
        } catch (err) {
          console.error('Failed to create WebRTC offer:', err);
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
      try {
        store.setStatus('connecting');
        const webrtc = initWebRTC(false);
        const answer = await webrtc.createAnswer(sdp);
        socket.emit('webrtc:answer', { roomId: store.roomId, sdp: answer });
      } catch (err) {
        console.error('Failed to handle WebRTC offer:', err);
        store.setStatus('failed', 'Failed to connect with sender');
      }
    });

    // WebRTC Answer received (by Sender)
    socket.on('webrtc:answer', async ({ sdp }) => {
      try {
        if (webrtcRef.current) {
          await webrtcRef.current.handleAnswer(sdp);
        }
      } catch (err) {
        console.error('Failed to handle WebRTC answer:', err);
      }
    });

    // WebRTC ICE Candidate received
    socket.on('webrtc:ice-candidate', async ({ candidate }) => {
      try {
        if (webrtcRef.current) {
          await webrtcRef.current.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    });

    // Peer disconnected
    socket.on('peer:disconnected', ({ role, message }) => {
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

    return () => {
      socket.off('receiver:joined');
      socket.off('transfer:incoming');
      socket.off('transfer:decision');
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('peer:disconnected');
    };
  }, [store.roomId, store.selectedFiles]);

  /**
   * Helper to instantiate and wire WebRTCEngine
   */
  const initWebRTC = useCallback((isInitiator) => {
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }

    const socket = socketRef.current || socketClient.getSocket();

    const engine = new WebRTCEngine({
      iceServers: iceServersRef.current,
      onIceCandidate: (candidate) => {
        socket.emit('webrtc:ice-candidate', {
          roomId: store.roomId,
          candidate
        });
      },
      onConnectionStateChange: (state) => {
        console.log('[WebRTC State]', state);
        if (state === 'connected') {
          store.setStatus('transferring');
          // If sender, begin streaming chunks
          if (isInitiator && store.selectedFiles.length > 0) {
            engine.sendFiles(store.selectedFiles).catch(err => {
              console.error('Error while sending files:', err);
              store.setStatus('failed', 'Error occurred during file transfer');
            });
          }
        } else if (state === 'failed') {
          store.setStatus('failed', 'WebRTC connection failed. Check your network or firewall.');
        } else if (state === 'disconnected') {
          if (store.status === 'transferring') {
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
        console.error('WebRTC Engine error:', err);
        store.setStatus('failed', err?.message || 'Transfer error');
      },
      onCancel: (reason) => {
        store.setStatus('cancelled', reason);
      }
    });

    webrtcRef.current = engine;
    return engine;
  }, [store.roomId, store.selectedFiles, store.status]);

  /**
   * SENDER: Create a new room with selected files
   */
  const createRoom = useCallback(async () => {
    if (store.selectedFiles.length === 0) {
      store.addToast({
        type: 'error',
        title: 'No Files Selected',
        message: 'Please choose at least one file to send.'
      });
      return;
    }

    store.setStatus('creating');
    const socket = socketRef.current || socketClient.connect();
    const deviceInfo = getDeviceInfo();

    socket.emit('room:create', { deviceInfo }, (response) => {
      if (response && response.success) {
        const fullUrl = `${window.location.origin}/?room=${response.roomId}`;
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
  }, [store.selectedFiles]);

  /**
   * RECEIVER: Join an existing room via URL/ID
   */
  const joinRoom = useCallback(async (roomId) => {
    if (!roomId) return;

    store.setRole('receiver');
    store.setStatus('connecting');
    const socket = socketRef.current || socketClient.connect();
    const deviceInfo = getDeviceInfo();

    socket.emit('room:join', { roomId, deviceInfo }, (response) => {
      if (response && response.success) {
        store.setRoom({
          roomId,
          roomUrl: window.location.href,
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
  }, []);

  /**
   * RECEIVER: Accept incoming file transfer
   */
  const acceptTransfer = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !store.roomId) return;

    socket.emit('transfer:decision', {
      roomId: store.roomId,
      accepted: true
    });
    store.setStatus('connecting');
  }, [store.roomId]);

  /**
   * RECEIVER: Reject incoming file transfer
   */
  const rejectTransfer = useCallback((reason = 'Transfer declined by receiver') => {
    const socket = socketRef.current;
    if (!socket || !store.roomId) return;

    socket.emit('transfer:decision', {
      roomId: store.roomId,
      accepted: false,
      reason
    });
    store.setStatus('cancelled', reason);
  }, [store.roomId]);

  /**
   * Cancel active transfer
   */
  const cancelTransfer = useCallback(() => {
    if (webrtcRef.current) {
      webrtcRef.current.cancelTransfer('Transfer cancelled by user');
    }
    const socket = socketRef.current;
    if (socket && store.roomId) {
      socket.emit('transfer:status', {
        roomId: store.roomId,
        status: 'cancelled',
        message: 'Transfer cancelled by user'
      });
    }
    store.setStatus('cancelled');
  }, [store.roomId]);

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
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
      webrtcRef.current = null;
    }
    const socket = socketRef.current;
    if (socket && store.roomId) {
      socket.emit('room:leave', { roomId: store.roomId });
    }
    // Clean URL query param if present
    if (window.history.pushState) {
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
    store.resetTransfer();
  }, [store.roomId]);

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
