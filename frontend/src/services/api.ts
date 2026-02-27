import axios from 'axios';
import { Criminal, CrimeType } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Profile {
  firstName?: string;
  lastName?: string;
  service?: string;
  grade?: string;
}

interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  profile: Profile;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  service?: string;
  grade?: string;
  roleIds: string[];
}

interface CriminalWritePayload {
  caseNumber: string;
  firstName: string;
  lastName: string;
  alias?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  gender?: string;
  crimeTypeId: string;
  crimeDate?: string;
  crimeLocation?: string;
  description: string;
  status?: string;
  dangerLevel?: string;
  lastKnownAddress?: string;
  phoneNumber?: string;
  arrestation?: {
    arrestDate?: string;
    arrestLocation?: string;
    arrestingUnit?: string;
    arrestingOfficer?: string;
    warrantNumber?: string;
    notes?: string;
  };
}

interface EvidenceWritePayload {
  title?: string;
  description?: string;
  files?: File[];
}

interface CrimeTypeWritePayload {
  name: string;
  code: string;
  description?: string;
  severity: string;
}

type UserWritePayload = Record<string, unknown>;
type CriminalSearchParams = Record<string, string>;

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

// Intercepteur pour gÃƒÂ©rer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));



    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================

export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', { username, password });
    return response.data;
  },

  register: async (data: RegisterPayload) => {
    const response = await api.post<ApiResponse<AuthUser>>('/auth/register', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get<ApiResponse<AuthUser>>('/auth/profile');
    return response.data;
  },

  logout: async () => {
    const response = await api.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  },
};

// ==================== CRIMINALS ====================

export const criminalsAPI = {
  getAll: async (page = 1, limit = 10) => {
    const response = await api.get<ApiResponse<Criminal[]>>(`/criminals?page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Criminal>>(`/criminals/${id}`);
    return response.data;
  },

  create: async (data: CriminalWritePayload) => {
    const response = await api.post<ApiResponse<Criminal>>('/criminals', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CriminalWritePayload>) => {
    const response = await api.put<ApiResponse<Criminal>>(`/criminals/${id}`, data);
    return response.data;
  },

  uploadPhoto: async (id: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    const response = await api.post<ApiResponse<Criminal>>(`/criminals/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  addEvidence: async (id: string, payload: EvidenceWritePayload) => {
    const form = new FormData();
    if (payload.title) form.append('title', payload.title);
    if (payload.description) form.append('description', payload.description);
    (payload.files || []).forEach((file) => form.append('evidenceFiles', file));

    const response = await api.post<ApiResponse<unknown>>(`/criminals/${id}/evidences`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  search: async (params: CriminalSearchParams) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get<ApiResponse<Criminal[]>>(`/criminals/search?${queryString}`);
    return response.data;
  },
};

// ==================== CRIME TYPES ====================

export const crimeTypesAPI = {
  getAll: async () => {
    const response = await api.get<ApiResponse<CrimeType[]>>('/crime-types');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<CrimeType>>(`/crime-types/${id}`);
    return response.data;
  },

  create: async (data: CrimeTypeWritePayload) => {
    const response = await api.post<ApiResponse<CrimeType>>('/crime-types', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CrimeTypeWritePayload>) => {
    const response = await api.put<ApiResponse<CrimeType>>(`/crime-types/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/crime-types/${id}`);
    return response.data;
  },
};

// ==================== USERS ====================

export const usersAPI = {
  getAll: async (page = 1, limit = 10) => {
    const response = await api.get<ApiResponse<AuthUser[]>>(`/users?page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<AuthUser>>(`/users/${id}`);
    return response.data;
  },

  update: async (id: string, data: UserWritePayload) => {
    const response = await api.put<ApiResponse<AuthUser>>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/users/${id}`);
    return response.data;
  },
};

// ==================== AUDIT ====================

export const auditAPI = {
  getAll: async (page = 1, limit = 100) => {
    const response = await api.get<ApiResponse<unknown[]>>(`/audit?page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<unknown>>(`/audit/${id}`);
    return response.data;
  },

  getEntityHistory: async (entity: string, entityId: string) => {
    const response = await api.get<ApiResponse<unknown[]>>(`/audit/${entity}/${entityId}`);
    return response.data;
  },
};

export default api;

