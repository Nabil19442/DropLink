import dotenv from 'dotenv';
dotenv.config();

// Parse comma-separated CLIENT_ORIGIN
const parseOrigins = (rawOrigin) => {
  if (!rawOrigin || rawOrigin.trim() === '') {
    return ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'];
  }
  if (rawOrigin.trim() === '*') return '*';
  return rawOrigin.split(',').map(o => o.trim().replace(/\/+$/, '')).filter(Boolean);
};

const allowedOriginsList = parseOrigins(process.env.CLIENT_ORIGIN);

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  allowedOrigins: allowedOriginsList,
  allowVercelPreviews: process.env.ALLOW_VERCEL_PREVIEWS === 'true' || process.env.NODE_ENV !== 'production',
  env: process.env.NODE_ENV || 'development',
  roomTtlMs: parseInt(process.env.ROOM_TTL_MS, 10) || 30 * 60 * 1000, // 30 minutes
  maxFilesPerTransfer: parseInt(process.env.MAX_FILES_PER_TRANSFER, 10) || 50,
  maxTotalSizeBytes: parseInt(process.env.MAX_TOTAL_SIZE_BYTES, 10) || 5 * 1024 * 1024 * 1024, // 5 GB
  
  // WebRTC ICE servers configuration (STUN + optional TURN for Coturn on VPS)
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

/**
 * Validates whether an incoming HTTP or WebSocket origin is permitted
 */
export function isOriginAllowed(origin) {
  // Allow requests with no origin (e.g. mobile native webview, server-to-server, curl)
  if (!origin) return true;

  if (config.allowedOrigins === '*') return true;

  const normalized = origin.replace(/\/+$/, '');

  // Check exact configured origins
  if (Array.isArray(config.allowedOrigins) && config.allowedOrigins.includes(normalized)) {
    return true;
  }

  // Allow local development ports and LAN subnets
  if (
    normalized.startsWith('http://localhost:') ||
    normalized.startsWith('http://127.0.0.1:') ||
    normalized.startsWith('http://192.168.') ||
    normalized.startsWith('http://10.')
  ) {
    return true;
  }

  // Allow Vercel preview deployment branches (*.vercel.app)
  if (config.allowVercelPreviews && normalized.endsWith('.vercel.app')) {
    return true;
  }

  // Allow Render preview URLs (*.onrender.com)
  if (normalized.endsWith('.onrender.com')) {
    return true;
  }

  return false;
}
