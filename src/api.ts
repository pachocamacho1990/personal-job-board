const API_BASE = '/jobboard/api';

function getToken(): string | null {
  return localStorage.getItem('authToken');
}

function saveToken(token: string): void {
  localStorage.setItem('authToken', token);
}

export function clearToken(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('agentChatMessages');
  localStorage.removeItem('agentOnboardingStatus');
  localStorage.removeItem('agentPanelOpen');
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(options.headers as Record<string, string> || {})
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

function createCrudApi<T>(basePath: string) {
  return {
    getAll: async (params?: Record<string, any>): Promise<T[]> => {
      const query = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest<T[]>(`${basePath}${query}`);
    },
    create: async (data: Partial<T>): Promise<T> =>
      apiRequest<T>(basePath, { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: number | string, data: Partial<T>): Promise<T> =>
      apiRequest<T>(`${basePath}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id: number | string): Promise<{ message: string }> =>
      apiRequest<{ message: string }>(`${basePath}/${id}`, { method: 'DELETE' }),
  };
}

function createFilesApi(basePath: string) {
  return {
    getAll: async (ownerId: number | string): Promise<any[]> =>
      apiRequest<any[]>(`${basePath}/${ownerId}/files`),
    upload: async (ownerId: number | string, file: File): Promise<any> => {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}${basePath}/${ownerId}/files`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
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
    delete: async (ownerId: number | string, fileId: number | string): Promise<{ message: string }> =>
      apiRequest<{ message: string }>(`${basePath}/${ownerId}/files/${fileId}`, { method: 'DELETE' }),
    getDownloadUrl: (ownerId: number | string, fileId: number | string): string =>
      `${API_BASE}${basePath}/${ownerId}/files/${fileId}/download`,
  };
}

export const api = {
  auth: {
    signup: async (email: string, password: string): Promise<any> => {
      const data = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.token) saveToken(data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    },
    login: async (email: string, password: string): Promise<any> => {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.token) saveToken(data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    },
    me: async (): Promise<any> => apiRequest('/auth/me'),
    logout: () => {
      clearToken();
      window.location.href = '/jobboard/login.html';
    }
  },

  jobs: {
    ...createCrudApi<any>('/jobs'),
    getOne: async (id: number | string): Promise<any> => apiRequest(`/jobs/${id}`),
    getHistory: async (id: number | string): Promise<any[]> => apiRequest(`/jobs/${id}/history`),
    transform: async (id: number | string): Promise<any> => apiRequest(`/jobs/${id}/transform`, { method: 'POST' }),
  },

  business: {
    ...createCrudApi<any>('/business'),
    files: createFilesApi('/business'),
  },

  boards: createCrudApi<any>('/boards'),

  files: createFilesApi('/jobs'),
};
