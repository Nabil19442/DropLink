import rateLimit from 'express-rate-limit';

// Global API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many requests, please try again later.'
  }
});

// Stricter rate limiter for room creation
export const createRoomLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 room creations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many rooms created from this IP. Please wait a moment.'
  }
});

