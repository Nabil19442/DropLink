/**
 * Production-ready Backend URL and API path resolution
 */

// Canonical deployed Render signaling backend fallback
const FALLBACK_PRODUCTION_BACKEND = 'https://droplink-gufq.onrender.com';

export function getBackendUrl() {
  const envUrl = import.meta.env.VITE_SERVER_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // In local development, return empty string so Vite proxies /socket.io and /api to localhost:5000
  if (import.meta.env.DEV) {
    return '';
  }

  // In production (e.g. deployed on Vercel), fallback to the deployed Render backend
  return FALLBACK_PRODUCTION_BACKEND;
}

export function getApiUrl(path) {
  const base = getBackendUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

export function getAppBaseUrl() {
  const explicitAppUrl = import.meta.env.VITE_APP_URL;
  if (explicitAppUrl && typeof explicitAppUrl === 'string' && explicitAppUrl.trim().length > 0) {
    return explicitAppUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'https://droplink-sigma-ten.vercel.app';
}
