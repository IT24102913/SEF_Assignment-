// Centralized API configuration
// Local development automatically targets http://localhost:5126/api
// Production deployments (e.g. Vercel) target the Railway backend by default
// Can be customized anytime via VITE_API_BASE_URL in Vercel settings or .env
const cleanBaseUrl = (url) => {
  if (!url) return '';
  let cleaned = url.trim().replace(/\/+$/, ''); // Remove trailing slashes
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  return cleaned;
};

export const API_BASE_URL = (() => {
  const customUrl = import.meta.env.VITE_API_BASE_URL;
  // If explicitly configured with a remote hosted URL in Vercel settings
  if (customUrl && !customUrl.includes('localhost') && !customUrl.includes('127.0.0.1')) {
    return cleanBaseUrl(customUrl);
  }
  // Local development
  if (import.meta.env.DEV) {
    return cleanBaseUrl(customUrl || 'http://localhost:5126/api');
  }
  // Production deployment (e.g. Vercel) targets Railway backend
  return cleanBaseUrl('https://sefassignment-production.up.railway.app/api');
})();

