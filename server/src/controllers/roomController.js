import { roomService } from '../services/roomService.js';
import { config } from '../config/index.js';
import { isValidRoomId } from '../utils/validators.js';

export const roomController = {
  /**
   * Health check
   */
  getHealth(req, res) {
    res.json({
      status: 'ok',
      service: 'DropLink Signaling Server',
      activeRooms: roomService.getActiveRoomsCount(),
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Returns public WebRTC ICE servers configuration
   */
  getIceServers(req, res) {
    res.json({
      status: 'success',
      iceServers: config.iceServers
    });
  },

  /**
   * Verify if a room exists and can be joined
   */
  getRoomInfo(req, res) {
    const { roomId } = req.params;

    if (!isValidRoomId(roomId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid room format'
      });
    }

    const room = roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({
        status: 'error',
        code: 'ROOM_NOT_FOUND',
        message: 'Transfer room not found or expired.'
      });
    }

    // Return non-sensitive summary
    res.json({
      status: 'success',
      data: {
        id: room.id,
        status: room.status,
        senderDevice: room.sender?.device || null,
        hasReceiver: !!room.receiver,
        filesCount: room.filesMeta ? room.filesMeta.length : 0,
        totalSize: room.filesMeta ? room.filesMeta.reduce((acc, f) => acc + f.size, 0) : 0,
        files: room.filesMeta || [],
        createdAt: room.createdAt,
        expiresAt: room.expiresAt
      }
    });
  }
};
