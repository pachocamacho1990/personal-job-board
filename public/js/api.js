/**
 * API Client for Job Board
 * Handles all communication with the backend REST API
 */

const API_BASE = '/api';

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
            clearToken();
            window.location.href = '/login.html';
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
            window.location.href = '/login.html';
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
        }
    }
};
