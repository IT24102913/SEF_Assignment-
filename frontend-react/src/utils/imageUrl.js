// Backend base URL (strip /api suffix if present, keep host only)
const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5126';
const API_BASE = rawBase.replace(/\/api\/?$/, '').replace(/\/$/, '');

/**
 * Resolve any image URL to an absolute URL.
 * Handles: base64, relative paths, absolute URLs (including old localhost).
 */
export const resolveImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';

    // Base64 data URIs — return as-is
    if (trimmed.startsWith('data:image/')) return trimmed;

    // Extract relative path from any format containing /uploads/
    if (trimmed.startsWith('/uploads/') || trimmed.includes('/uploads/')) {
        const rel = trimmed.startsWith('/uploads/')
            ? trimmed
            : ('/uploads/' + trimmed.split('/uploads/')[1]);
        return getImageUrl(rel);
    }

    // Fallback: getImageUrl handles it
    return getImageUrl(trimmed);
};

/**
 * Prepend API base URL to relative paths.
 */
export const getImageUrl = (url) => {
    if (!url) return '/assets/images/pill.jpg';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const path = url.startsWith('/') ? url : '/' + url;
    return `${API_BASE}${path}`;
};

export default getImageUrl;
