import api from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  username?: string;
  full_name: string;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'STAGE_WORKER';
  company_id: number | null;
  company?: {
    id: number;
    name: string;
  };
}

export interface RegisterSuperAdminRequest {
  email: string;
  username?: string;
  password: string;
  full_name: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);
    
    const response = await api.post<LoginResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  async registerSuperAdmin(data: RegisterSuperAdminRequest): Promise<User> {
    const response = await api.post<User>('/auth/register/super-admin', data);
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};
