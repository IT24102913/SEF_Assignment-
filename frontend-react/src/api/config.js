// Centralized API configuration
// Falls back to http://localhost:5126/api for local development
// In production (e.g. Vercel), set VITE_API_BASE_URL in your environment variables.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5126/api';
