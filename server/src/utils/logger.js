const formatTime = () => new Date().toISOString();

export const logger = {
  info: (msg, meta = {}) => {
    console.log(`[${formatTime()}] [INFO] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[${formatTime()}] [WARN] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (msg, error = {}) => {
    console.error(`[${formatTime()}] [ERROR] ${msg}`, error?.message || error || '');
  },
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${formatTime()}] [DEBUG] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
    }
  }
};

