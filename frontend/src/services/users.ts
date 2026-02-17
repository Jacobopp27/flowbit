import api from './api';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  STAGE_WORKER = 'STAGE_WORKER',
}

export interface User {
  id: number;
  email: string;
  username?: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  stage_ids: number[];
}

export interface UserCreate {
  email: string;
  username?: string;
  full_name: string;
  role: UserRole;
  password: string;
  is_active: boolean;
  stage_ids?: number[];
}

export interface UserUpdate {
  email?: string;
  username?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
  password?: string;
  stage_ids?: number[];
}

const userService = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users/');
    return response.data;
  },

  getById: async (id: number): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  create: async (data: UserCreate): Promise<User> => {
    const response = await api.post<User>('/users/', data);
    return response.data;
  },

  update: async (id: number, data: UserUpdate): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

export default userService;
