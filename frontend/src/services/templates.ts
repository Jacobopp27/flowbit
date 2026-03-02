import api from './api';

export interface TemplateStageCreate {
  stage_id: number;
  duration_days: number;
  stage_order: number;
  has_operational_cost: boolean;
  cost_per_unit?: number;
  depends_on_stage_ids: number[];
}

export interface TemplateStageResponse {
  id: number;
  stage_id: number;
  stage_name: string;
  duration_days: number;
  stage_order: number;
  has_operational_cost: boolean;
  cost_per_unit?: number;
  depends_on_stage_ids: number[];
}

export interface TemplateCreate {
  name: string;
  description?: string;
  stages: TemplateStageCreate[];
}

export interface TemplateUpdate {
  name?: string;
  description?: string;
  stages?: TemplateStageCreate[];
}

export interface TemplateListResponse {
  id: number;
  name: string;
  description?: string;
  stages_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateDetailResponse {
  id: number;
  name: string;
  description?: string;
  stages: TemplateStageResponse[];
  created_at: string;
  updated_at: string;
}

export interface ApplyTemplateRequest {
  start_date?: string;
  final_deadline?: string;
}

export interface AppliedStageResponse {
  stage_id: number;
  stage_name: string;
  planned_due_date: string;
  has_operational_cost: boolean;
  cost_per_unit?: number;
  depends_on: number[];
  stage_order: number;
}

export interface ApplyTemplateResponse {
  stages: AppliedStageResponse[];
  calculated_start_date: string;
  calculated_end_date: string;
}

export const templatesService = {
  async listTemplates(): Promise<TemplateListResponse[]> {
    const response = await api.get('/templates/');
    return response.data;
  },

  async getTemplate(id: number): Promise<TemplateDetailResponse> {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },

  async createTemplate(data: TemplateCreate): Promise<TemplateDetailResponse> {
    const response = await api.post('/templates/', data);
    return response.data;
  },

  async updateTemplate(id: number, data: TemplateUpdate): Promise<TemplateDetailResponse> {
    const response = await api.put(`/templates/${id}`, data);
    return response.data;
  },

  async deleteTemplate(id: number): Promise<void> {
    await api.delete(`/templates/${id}`);
  },

  async applyTemplate(id: number, request: ApplyTemplateRequest): Promise<ApplyTemplateResponse> {
    const response = await api.post(`/templates/${id}/apply`, request);
    return response.data;
  },
};
