import { roomService } from '../services/roomService.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
  isValidRoomId,
  isValidDeviceInfo,
  isValidFileMetadata,
  isValidSdp,
  isValidIceCandidate
} from '../utils/validators.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Track simple message rate limiting per socket
    let messageCount = 0;
    const rateResetTimer = setInterval(() => { messageCount = 0; }, 1000);

    const isRateExceeded = () => {
      messageCount++;
      return messageCount > 50; // max 50 socket events/sec per connection
    };

    /**
     * SENDER: Create a new transfer room
     */
    socket.on('room:create', (payload = {}, callback) => {
      if (isRateExceeded()) {
        return callback?.({ success: false, error: 'Rate limit exceeded' });
      }

      try {
        const deviceInfo = payload.deviceInfo || {};
        const room = roomService.createRoom(socket.id, deviceInfo);
        socket.join(room.id);

        const responseData = {
          success: true,
          roomId: room.id,
          expiresAt: room.expiresAt,
          iceServers: config.iceServers
        };

        if (typeof callback === 'function') {
          callback(responseData);
        } else {
          socket.emit('room:created', responseData);
        }
      } catch (err) {
        logger.error('Error in room:create', err);
        callback?.({ success: false, error: 'Failed to create room' });
      }
    });

    /**
     * RECEIVER: Join an existing room
     */
    socket.on('room:join', ({ roomId, deviceInfo = {} } = {}, callback) => {
      if (isRateExceeded()) {
        return callback?.({ success: false, error: 'Rate limit exceeded' });
      }

      if (!isValidRoomId(roomId)) {
        return callback?.({ success: false, error: 'Invalid room ID format' });
      }

      const joinResult = roomService.joinRoom(roomId, socket.id, deviceInfo);
      if (!joinResult.success) {
        return callback?.(joinResult);
      }

      const room = joinResult.room;
      socket.join(roomId);

      // Notify the sender that receiver has arrived
      socket.to(room.sender.socketId).emit('receiver:joined', {
        receiverSocketId: socket.id,
        deviceInfo: room.receiver.device
      });

      const responseData = {
        success: true,
        roomId: room.id,
        senderDevice: room.sender?.device || null,
        files: room.filesMeta || [],
        iceServers: config.iceServers
      };

      if (typeof callback === 'function') {
        callback(responseData);
      } else {
        socket.emit('room:joined', responseData);
      }
    });

    /**
     * SENDER: Announce / Offer file metadata to receiver
     */
    socket.on('transfer:metadata', ({ roomId, files = [] } = {}, callback) => {
      if (isRateExceeded()) return;

      if (!isValidRoomId(roomId)) {
        return callback?.({ success: false, error: 'Invalid room ID' });
      }

      const validation = isValidFileMetadata(files, config.maxFilesPerTransfer, config.maxTotalSizeBytes);
      if (!validation.valid) {
        return callback?.({ success: false, error: validation.reason });
      }

      const updated = roomService.setFilesMetadata(roomId, socket.id, files);
      if (!updated) {
        return callback?.({ success: false, error: 'Unauthorized or room expired' });
      }

      const room = roomService.getRoom(roomId);
      if (room && room.receiver) {
        // Forward metadata request to receiver
        socket.to(room.receiver.socketId).emit('transfer:incoming', {
          senderDevice: room.sender?.device || null,
          files: room.filesMeta,
          totalSize: validation.totalSize
        });
      }

      callback?.({ success: true, count: files.length, totalSize: validation.totalSize });
    });

    /**
     * RECEIVER: User accepted or rejected the transfer
     */
    socket.on('transfer:decision', ({ roomId, accepted, reason = '' } = {}) => {
      if (isRateExceeded()) return;

      const room = roomService.getRoom(roomId);
      if (!room || !room.sender) return;

      if (accepted) {
        roomService.updateRoomStatus(roomId, 'transferring');
      }

      // Relay decision back to sender
      socket.to(room.sender.socketId).emit('transfer:decision', {
        accepted: Boolean(accepted),
        reason
      });
    });

    /**
     * WebRTC SDP Offer (Sender -> Receiver)
     */
    socket.on('webrtc:offer', ({ roomId, sdp } = {}, callback) => {
      if (isRateExceeded()) return;

      if (!isValidRoomId(roomId) || !isValidSdp(sdp)) {
        return callback?.({ success: false, error: 'Invalid offer payload' });
      }

      const room = roomService.getRoom(roomId);
      if (!room || !room.receiver) {
        return callback?.({ success: false, error: 'Receiver not connected' });
      }

      socket.to(room.receiver.socketId).emit('webrtc:offer', { sdp });
      callback?.({ success: true });
    });

    /**
     * WebRTC SDP Answer (Receiver -> Sender)
     */
    socket.on('webrtc:answer', ({ roomId, sdp } = {}, callback) => {
      if (isRateExceeded()) return;

      if (!isValidRoomId(roomId) || !isValidSdp(sdp)) {
        return callback?.({ success: false, error: 'Invalid answer payload' });
      }

      const room = roomService.getRoom(roomId);
      if (!room || !room.sender) {
        return callback?.({ success: false, error: 'Sender not connected' });
      }

      socket.to(room.sender.socketId).emit('webrtc:answer', { sdp });
      callback?.({ success: true });
    });

    /**
     * WebRTC ICE Candidate exchange (Bi-directional)
     */
    socket.on('webrtc:ice-candidate', ({ roomId, candidate } = {}) => {
      if (isRateExceeded()) return;
      if (!isValidRoomId(roomId) || !isValidIceCandidate(candidate)) return;

      const room = roomService.getRoom(roomId);
      if (!room) return;

      // Forward candidate to partner peer
      if (room.sender && room.sender.socketId === socket.id && room.receiver) {
        socket.to(room.receiver.socketId).emit('webrtc:ice-candidate', { candidate });
      } else if (room.receiver && room.receiver.socketId === socket.id && room.sender) {
        socket.to(room.sender.socketId).emit('webrtc:ice-candidate', { candidate });
      }
    });

    /**
     * Transfer status update (e.g. cancelled, completed)
     */
    socket.on('transfer:status', ({ roomId, status, message } = {}) => {
      if (isRateExceeded()) return;
      const room = roomService.getRoom(roomId);
      if (!room) return;

      roomService.updateRoomStatus(roomId, status);
      socket.to(roomId).emit('transfer:status', { status, message });
    });

    /**
     * Clean disconnect / exit room
     */
    const cleanup = () => {
      clearInterval(rateResetTimer);
      const result = roomService.handleDisconnect(socket.id);
      if (result && result.partnerSocketId) {
        io.to(result.partnerSocketId).emit('peer:disconnected', {
          role: result.role,
          message: `${result.role === 'sender' ? 'Sender' : 'Receiver'} device disconnected.`
        });
      }
    };

    socket.on('room:leave', ({ roomId } = {}) => {
      if (isValidRoomId(roomId)) {
        socket.leave(roomId);
      }
      cleanup();
    });

    socket.on('disconnect', () => {
      cleanup();
    });
  });
}
