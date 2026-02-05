/**
 * API Client for Job Board
 * Handles all communication with the backend REST API
 */

const API_BASE = '/jobboard/api';

/**
 * Get JWT token from localStorage
 */
function getToken() {
    return localStorage.getItem('authToken');
}

/**
 * Save JWT token to localStorage
 */
function saveToken(token) {
    localStorage.setItem('authToken', token);
}

/**
 * Clear JWT token from localStorage
 */
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

        // Handle unauthorized (token expired or invalid)
        if (response.status === 401) {
            // Only redirect if not on the login endpoint itself
            if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
                clearToken();
                window.location.href = '/jobboard/login.html';
            }
            throw new Error('Unauthorized');
        }

        // Parse JSON response
        const data = await response.json();

        // Handle non-2xx responses
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
 * API client object with all endpoints
 */
const api = {
    auth: {
        /**
         * Sign up new user
         * @param {string} email 
         * @param {string} password 
         */
        signup: async (email, password) => {
            const data = await apiRequest('/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            if (data.token) {
                saveToken(data.token);
            }
            return data;
        },

        /**
         * Login existing user
         * @param {string} email 
         * @param {string} password 
         */
        login: async (email, password) => {
            const data = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            if (data.token) {
                saveToken(data.token);
            }
            return data;
        },

        /**
         * Get current user info
         */
        me: async () => {
            return await apiRequest('/auth/me');
        },

        /**
         * Logout user
         */
        logout: () => {
            clearToken();
            window.location.href = '/jobboard/login.html';
        }
    },

    jobs: {
        /**
         * Get all jobs for authenticated user
         */
        getAll: async () => {
            return await apiRequest('/jobs');
        },

        /**
         * Create new job
         * @param {Object} jobData 
         */
        create: async (jobData) => {
            return await apiRequest('/jobs', {
                method: 'POST',
                body: JSON.stringify(jobData)
            });
        },

        /**
         * Update existing job
         * @param {number} id 
         * @param {Object} jobData 
         */
        update: async (id, jobData) => {
            return await apiRequest(`/jobs/${id}`, {
                method: 'PUT',
                body: JSON.stringify(jobData)
            });
        },

        /**
         * Delete job
         * @param {number} id 
         */
        delete: async (id) => {
            return await apiRequest(`/jobs/${id}`, {
                method: 'DELETE'
            });
        },

        /**
         * Get job history
         * @param {number} id
         */
        getHistory: async (id) => {
            return await apiRequest(`/jobs/${id}/history`);
        }
    },

    business: {
        getAll: async () => {
            return await apiRequest('/business');
        },
        create: async (entityData) => {
            return await apiRequest('/business', {
                method: 'POST',
                body: JSON.stringify(entityData)
            });
        },
        update: async (id, entityData) => {
            return await apiRequest(`/business/${id}`, {
                method: 'PUT',
                body: JSON.stringify(entityData)
            });
        },
        delete: async (id) => {
            return await apiRequest(`/business/${id}`, {
                method: 'DELETE'
            });
        },
        files: {
            getAll: async (entityId) => {
                return await apiRequest(`/business/${entityId}/files`);
            },
            upload: async (entityId, file) => {
                const token = getToken();
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(`${API_BASE}/business/${entityId}/files`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
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
            delete: async (entityId, fileId) => {
                return await apiRequest(`/business/${entityId}/files/${fileId}`, {
                    method: 'DELETE'
                });
            },
            getDownloadUrl: (entityId, fileId) => {
                return `${API_BASE}/business/${entityId}/files/${fileId}/download`;
            }
        }
    },

    files: {
        /**
         * Get all files for a job
         * @param {number} jobId 
         */
        getAll: async (jobId) => {
            return await apiRequest(`/jobs/${jobId}/files`);
        },

        /**
         * Upload a file to a job
         * @param {number} jobId 
         * @param {File} file 
         */
        upload: async (jobId, file) => {
            const token = getToken();
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE}/jobs/${jobId}/files`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
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

        /**
         * Delete a file
         * @param {number} jobId 
         * @param {number} fileId 
         */
        delete: async (jobId, fileId) => {
            return await apiRequest(`/jobs/${jobId}/files/${fileId}`, {
                method: 'DELETE'
            });
        },

        /**
         * Get download URL for a file
         * @param {number} jobId 
         * @param {number} fileId 
         */
        getDownloadUrl: (jobId, fileId) => {
            return `${API_BASE}/jobs/${jobId}/files/${fileId}/download`;
        }
    }
};
