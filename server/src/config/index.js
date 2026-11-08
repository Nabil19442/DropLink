import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  env: process.env.NODE_ENV || 'development',
  roomTtlMs: parseInt(process.env.ROOM_TTL_MS, 10) || 30 * 60 * 1000, // 30 minutes
  maxFilesPerTransfer: parseInt(process.env.MAX_FILES_PER_TRANSFER, 10) || 50,
  maxTotalSizeBytes: parseInt(process.env.MAX_TOTAL_SIZE_BYTES, 10) || 5 * 1024 * 1024 * 1024, // 5 GB
  
  // WebRTC ICE servers configuration
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ]
    },
    ...(process.env.TURN_SERVER_URL ? [{
      urls: process.env.TURN_SERVER_URL.split(',').map(u => u.trim()),
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || '',
    }] : [])
  ]
};
