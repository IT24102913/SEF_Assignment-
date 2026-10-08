import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 45000,
});

// Auto-retry once on cold-start timeouts / network errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config || {};

        const isTimeout =
            error.code === 'ECONNABORTED' ||
            error.message?.toLowerCase().includes('timeout');
        const isNetworkError = !error.response;

        // Only retry once
        if ((isTimeout || isNetworkError) && !config._retried) {
            config._retried = true;
            config.timeout = 60000;

            // Short delay to let backend finish waking up
            await new Promise((resolve) =>
                setTimeout(resolve, 1500)
            );

            return api.request(config);
        }

        return Promise.reject(error);
    }
);

// Add token to all requests
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token');
        if (token && !token.startsWith('mock-demo')) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Helper to extract clean error message from ASP.NET Core response
const extractErrorMessage = (error, defaultMsg) => {
    if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string' && data.length > 0) return data;
        if (data.message) return data.message;
        if (data.errors && typeof data.errors === 'object') {
            const firstKey = Object.keys(data.errors)[0];
            const firstErr = data.errors[firstKey];
            if (Array.isArray(firstErr) && firstErr.length > 0) return `${firstKey}: ${firstErr[0]}`;
            if (typeof firstErr === 'string') return `${firstKey}: ${firstErr}`;
        }
        if (data.title && data.title !== 'One or more validation errors occurred.') return data.title;
    }
    if (error.message === 'Network Error') {
        return 'Network Error: Cannot connect to HealthBridge server. Please verify backend is running.';
    }
    return error.message || defaultMsg;
};

export const login = async (email, password) => {
    try {
        const response = await api.post('/Auth/login', { email, password });
        return response.data;
    } catch (error) {
        const message = extractErrorMessage(error, 'Invalid email or password');
        throw { message };
    }
};

export const register = async (payload) => {
    try {
        const response = await api.post('/Auth/register', payload);
        return response.data;
    } catch (error) {
        const message = extractErrorMessage(error, 'Registration failed. Please try again.');
        throw { message };
    }
};

export const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
};




// Named exports so components can do: import { api, getErrorMessage } from '../../api/authApi'
export { api };
export const getErrorMessage = extractErrorMessage;

export default api;