import { io } from 'socket.io-client';
import { getBackendUrl } from '../utils/api.js';

class SocketClient {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (this.socket) {
      if (this.socket.disconnected) {
        this.socket.connect();
      }
      return this.socket;
    }

    const serverUrl = getBackendUrl() || (typeof window !== 'undefined' ? window.location.origin : '');

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });

    return this.socket;
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketClient = new SocketClient();
