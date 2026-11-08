/**
 * Production-ready Backend URL and API path resolution
 */

export function getBackendUrl() {
  const envUrl = import.meta.env.VITE_SERVER_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // In development, fallback to empty string to leverage the Vite proxy,
  // or window.location.origin if in production self-hosted mode
  return '';
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
  return '';
}
