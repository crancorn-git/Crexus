const stripTrailingSlash = (value) => String(value || '').trim().replace(/\/$/, '');

const configuredApiBase = stripTrailingSlash(
  import.meta.env.VITE_API_BASE_URL ||
  localStorage.getItem('cranix_scout_api_base')
);

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Production builds call same-origin /api so Vercel can proxy through frontend/vercel.json.
// Local dev still talks directly to the local Express server.
export const API_BASE = configuredApiBase || (isLocalHost ? 'http://localhost:5000' : '');
