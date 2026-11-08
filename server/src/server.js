import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config, isOriginAllowed } from './config/index.js';
import { logger } from './utils/logger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { roomController } from './controllers/roomController.js';
import { setupSocketHandlers } from './socket/socketHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);

// Security Headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // In development/hybrid Vite setup
}));

// CORS Configuration for Production (Vercel & custom domains)
app.use(cors({
  origin: (origin, callback) => {
    const allowed = isOriginAllowed(origin);
    if (allowed) {
      return callback(null, true);
    }
    logger.warn(`Blocked HTTP request from disallowed origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use('/api', apiLimiter);

// REST API Routes
app.get('/api/health', roomController.getHealth);
app.get('/api/config/ice', roomController.getIceServers);
app.get('/api/rooms/:roomId', roomController.getRoomInfo);

// Serve production static build if available
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// Socket.IO Setup with Production CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowed = isOriginAllowed(origin);
      if (allowed) {
        return callback(null, true);
      }
      logger.warn(`Blocked Socket.IO connection from disallowed origin: ${origin}`);
      return callback(null, false);
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 30000,
  pingInterval: 15000,
  maxHttpBufferSize: 1e6 // 1MB for signaling payload
});

// Register Socket handlers
setupSocketHandlers(io);

// Start Server
server.listen(config.port, () => {
  logger.info(`===============================================`);
  logger.info(`DropLink Signaling Server running on port ${config.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`ICE STUN Servers loaded: ${config.iceServers.length}`);
  logger.info(`===============================================`);
});

// Graceful termination
const shutdown = () => {
  logger.info('Shutting down DropLink server gracefully...');
  server.close(() => {
    logger.info('DropLink HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
