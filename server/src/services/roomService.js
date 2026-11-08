import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class RoomService {
  constructor() {
    /** @type {Map<string, Object>} */
    this.rooms = new Map();
    /** @type {Map<string, string>} socketId -> roomId */
    this.socketToRoom = new Map();

    // Start background cleanup timer
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRooms();
    }, 60 * 1000); // Check every 60s
  }

  /**
   * Generates a cryptographically secure, readable room ID
   */
  generateRoomId() {
    // 6 random bytes in base64url produces 8 url-safe characters (e.g. "aX9-zQ2k")
    return crypto.randomBytes(6).toString('base64url');
  }

  /**
   * Creates a new temporary room for a sender
   */
  createRoom(senderSocketId, deviceInfo = {}) {
    let roomId = this.generateRoomId();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomId();
    }

    const now = Date.now();
    const room = {
      id: roomId,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + config.roomTtlMs,
      sender: {
        socketId: senderSocketId,
        device: deviceInfo,
        joinedAt: now
      },
      receiver: null,
      filesMeta: null,
      status: 'waiting' // 'waiting' | 'paired' | 'transferring' | 'completed' | 'cancelled'
    };

    this.rooms.set(roomId, room);
    this.socketToRoom.set(senderSocketId, roomId);

    logger.info(`Room created: ${roomId} by sender ${senderSocketId}`, { device: deviceInfo });
    return room;
  }

  /**
   * Retrieve a room by ID
   */
  getRoom(roomId) {
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Check expiration
    if (Date.now() > room.expiresAt) {
      this.deleteRoom(roomId, 'expired');
      return null;
    }

    return room;
  }

  /**
   * Receiver attempts to join a room
   */
  joinRoom(roomId, receiverSocketId, deviceInfo = {}) {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, code: 'ROOM_NOT_FOUND', message: 'Transfer room does not exist or has expired.' };
    }

    if (room.sender && room.sender.socketId === receiverSocketId) {
      return { success: false, code: 'ALREADY_SENDER', message: 'You are already the sender for this room.' };
    }

    if (room.receiver && room.receiver.socketId !== receiverSocketId) {
      return { success: false, code: 'ROOM_FULL', message: 'This transfer room is currently busy with another device.' };
    }

    const now = Date.now();
    room.receiver = {
      socketId: receiverSocketId,
      device: deviceInfo,
      joinedAt: now
    };
    room.status = 'paired';
    room.lastActivityAt = now;

    this.socketToRoom.set(receiverSocketId, roomId);

    logger.info(`Receiver ${receiverSocketId} joined room ${roomId}`, { device: deviceInfo });
    return { success: true, room };
  }

  /**
   * Update files metadata for a room
   */
  setFilesMetadata(roomId, senderSocketId, files) {
    const room = this.getRoom(roomId);
    if (!room) return false;
    if (room.sender?.socketId !== senderSocketId) return false;

    room.filesMeta = files.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      lastModified: f.lastModified || Date.now()
    }));
    room.lastActivityAt = Date.now();

    return true;
  }

  /**
   * Update room status
   */
  updateRoomStatus(roomId, status) {
    const room = this.getRoom(roomId);
    if (room) {
      room.status = status;
      room.lastActivityAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Handles participant socket disconnection
   */
  handleDisconnect(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    this.socketToRoom.delete(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return null;

    let role = null;
    if (room.sender?.socketId === socketId) {
      role = 'sender';
      room.sender = null;
    } else if (room.receiver?.socketId === socketId) {
      role = 'receiver';
      room.receiver = null;
      if (room.status === 'paired' || room.status === 'transferring') {
        room.status = 'waiting';
      }
    }

    logger.info(`Socket ${socketId} disconnected from room ${roomId} (role: ${role})`);

    // If both left, or if sender leaves before pairing, delete immediately or after short grace
    if (!room.sender && !room.receiver) {
      this.deleteRoom(roomId, 'empty');
      return { roomId, role, roomDeleted: true };
    } else if (role === 'sender') {
      // If sender disconnected, the transfer cannot continue
      this.deleteRoom(roomId, 'sender_left');
      return { roomId, role, roomDeleted: true, partnerSocketId: room.receiver?.socketId };
    }

    return {
      roomId,
      role,
      roomDeleted: false,
      partnerSocketId: room.sender?.socketId
    };
  }

  /**
   * Deletes a room
   */
  deleteRoom(roomId, reason = 'unknown') {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.sender?.socketId) this.socketToRoom.delete(room.sender.socketId);
    if (room.receiver?.socketId) this.socketToRoom.delete(room.receiver.socketId);

    this.rooms.delete(roomId);
    logger.info(`Room ${roomId} deleted. Reason: ${reason}`);
  }

  /**
   * Periodically remove expired rooms
   */
  cleanupExpiredRooms() {
    const now = Date.now();
    let expiredCount = 0;

    for (const [roomId, room] of this.rooms.entries()) {
      if (now > room.expiresAt) {
        this.deleteRoom(roomId, 'expired_ttl');
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.info(`Cleaned up ${expiredCount} expired room(s). Active rooms remaining: ${this.rooms.size}`);
    }
  }

  /**
   * Diagnostic room count
   */
  getActiveRoomsCount() {
    return this.rooms.size;
  }
}

export const roomService = new RoomService();

