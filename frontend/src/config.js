export const API_BASE = import.meta.env.VITE_API_BASE_URL || (
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://crexusback.vercel.app"
);
