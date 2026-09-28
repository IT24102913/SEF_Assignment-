// Centralized API configuration
// Local development automatically targets http://localhost:5126/api
// Production deployments (e.g. Vercel) target the Railway backend by default
// Can be customized anytime via VITE_API_BASE_URL in Vercel settings or .env
export const API_BASE_URL = (() => {
  // If explicitly configured with a remote hosted URL
  const customUrl = import.meta.env.VITE_API_BASE_URL;
  if (customUrl && !customUrl.includes('localhost') && !customUrl.includes('127.0.0.1')) {
    return customUrl;
  }
  // Local development
  if (import.meta.env.DEV) {
    return customUrl || 'http://localhost:5126/api';
  }
  // Production deployment (e.g. Vercel) targets Railway backend
  return 'https://sefassignment-production.up.railway.app/api';
})();

