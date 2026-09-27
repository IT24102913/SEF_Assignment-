// Centralized API configuration
// Local development automatically targets http://localhost:5126/api
// Production deployments (e.g. Vercel) target the Railway backend by default
// Can be customized anytime via VITE_API_BASE_URL in Vercel settings or .env
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:5126/api'
    : 'https://sefassignment-production.up.railway.app/api');
