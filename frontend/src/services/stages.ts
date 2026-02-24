import api from './api';

export interface StageEdge {
  id: number;
  from_stage_id: number;
  to_stage_id: number;
}

export interface Stage {
  id: number;
  company_id: number;
  name: string;
  description?: string;
  color?: string;
  is_purchasing_stage: boolean;
  created_at: string;
  dependencies_from: StageEdge[];
  dependencies_to: StageEdge[];
}

export interface StageCreate {
  name: string;
  stage_name: string;
  description?: string;
  color?: string;
  is_purchasing_stage?: boolean;
}

export interface StageUpdate {
  name?: string;
  description?: string;
  color?: string;
  is_purchasing_stage?: boolean;
}

export interface StageEdgeCreate {
  from_stage_id: number;
  to_stage_id: number;
}

const stageService = {
  getAll: async (): Promise<Stage[]> => {
    const response = await api.get<Stage[]>('/stages/');
    return response.data;
  },

  getById: async (id: number): Promise<Stage> => {
    const response = await api.get<Stage>(`/stages/${id}`);
    return response.data;
  },

  create: async (data: StageCreate): Promise<Stage> => {
    const response = await api.post<Stage>('/stages/', data);
    return response.data;
  },

  update: async (id: number, data: StageUpdate): Promise<Stage> => {
    const response = await api.put<Stage>(`/stages/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/stages/${id}`);
  },

  addDependency: async (stageId: number, data: StageEdgeCreate): Promise<StageEdge> => {
    const response = await api.post<StageEdge>(`/stages/${stageId}/dependencies`, data);
    return response.data;
  },

  removeDependency: async (stageId: number, edgeId: number): Promise<void> => {
    await api.delete(`/stages/${stageId}/dependencies/${edgeId}`);
  },
};

export default stageService;
