import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Instance Axios avec configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT automatiquement
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré, rediriger vers login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================

export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// ==================== CRIMINALS ====================

export const criminalsAPI = {
  getAll: async (page = 1, limit = 10) => {
    const response = await api.get(`/criminals?page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/criminals/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/criminals', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/criminals/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/criminals/${id}`);
    return response.data;
  },

  search: async (params: any) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/criminals/search?${queryString}`);
    return response.data;
  },
};

// ==================== CRIME TYPES ====================

export const crimeTypesAPI = {
  getAll: async () => {
    const response = await api.get('/crime-types');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/crime-types/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/crime-types', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/crime-types/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/crime-types/${id}`);
    return response.data;
  },
};

// ==================== USERS ====================

export const usersAPI = {
  getAll: async (page = 1, limit = 10) => {
    const response = await api.get(`/users?page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// ==================== AUDIT ====================

export const auditAPI = {
  getAll: async (page = 1, limit = 100) => {
    const response = await api.get(`/audit?page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/audit/${id}`);
    return response.data;
  },

  getEntityHistory: async (entity: string, entityId: string) => {
    const response = await api.get(`/audit/${entity}/${entityId}`);
    return response.data;
  },
};

export default api;

