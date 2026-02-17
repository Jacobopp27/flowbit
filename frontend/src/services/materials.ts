import api from './api';

export interface Material {
  id: number;
  company_id: number;
  name: string;
  unit: string;
  supplier_id?: number;
  qty_available?: number;
  cost_per_unit?: number;
  category?: string;
  created_at: string;
}

export interface MaterialCreate {
  name: string;
  unit: string;
  supplier_id?: number;
}

export interface MaterialUpdate {
  name?: string;
  unit?: string;
  supplier_id?: number;
}

const materialService = {
  getAll: async (): Promise<Material[]> => {
    const response = await api.get<Material[]>('/materials/');
    return response.data;
  },

  getById: async (id: number): Promise<Material> => {
    const response = await api.get<Material>(`/materials/${id}`);
    return response.data;
  },

  create: async (data: MaterialCreate): Promise<Material> => {
    const response = await api.post<Material>('/materials/', data);
    return response.data;
  },

  update: async (id: number, data: MaterialUpdate): Promise<Material> => {
    const response = await api.put<Material>(`/materials/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/materials/${id}`);
  },
};

export default materialService;
