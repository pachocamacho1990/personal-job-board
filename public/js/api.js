/**
 * API Client for Job Board
 * Handles all communication with the backend REST API
 */

const API_BASE = '/jobboard/api';

function getToken() {
    return localStorage.getItem('authToken');
}

function saveToken(token) {
    localStorage.setItem('authToken', token);
}

function clearToken() {
    localStorage.removeItem('authToken');
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
                clearToken();
                window.location.href = '/jobboard/login.html';
            }
            throw new Error('Unauthorized');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

/**
 * Factory: generates standard CRUD methods for a resource
 */
function createCrudApi(basePath) {
    return {
        getAll: async () => apiRequest(basePath),
        create: async (data) => apiRequest(basePath, { method: 'POST', body: JSON.stringify(data) }),
        update: async (id, data) => apiRequest(`${basePath}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: async (id) => apiRequest(`${basePath}/${id}`, { method: 'DELETE' }),
    };
}

/**
 * Factory: generates file operations for a parent resource
 */
function createFilesApi(basePath) {
    return {
        getAll: async (ownerId) => apiRequest(`${basePath}/${ownerId}/files`),
        upload: async (ownerId, file) => {
            const token = getToken();
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE}${basePath}/${ownerId}/files`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.status === 401) {
                clearToken();
                window.location.href = '/jobboard/login.html';
                throw new Error('Unauthorized');
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            return data;
        },
        delete: async (ownerId, fileId) => apiRequest(`${basePath}/${ownerId}/files/${fileId}`, { method: 'DELETE' }),
        getDownloadUrl: (ownerId, fileId) => `${API_BASE}${basePath}/${ownerId}/files/${fileId}/download`,
    };
}

const api = {
    auth: {
        signup: async (email, password) => {
            const data = await apiRequest('/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            if (data.token) saveToken(data.token);
            return data;
        },
        login: async (email, password) => {
            const data = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            if (data.token) saveToken(data.token);
            return data;
        },
        me: async () => apiRequest('/auth/me'),
        logout: () => {
            clearToken();
            window.location.href = '/jobboard/login.html';
        }
    },

    jobs: {
        ...createCrudApi('/jobs'),
        getHistory: async (id) => apiRequest(`/jobs/${id}/history`),
    },

    business: {
        ...createCrudApi('/business'),
        files: createFilesApi('/business'),
    },

    files: createFilesApi('/jobs'),
};
