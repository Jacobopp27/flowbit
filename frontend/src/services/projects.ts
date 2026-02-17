import api from './api';

export interface ProjectProductItem {
  product_id: number;
  quantity: number;
}

export interface ProjectStageCreate {
  stage_id: number;
  planned_due_date: string;
  qty_required?: number;
  notes?: string;
  stage_order: number;
  depends_on: number[];  // List of stage_ids this stage depends on
  has_operational_cost: boolean;
  cost_per_unit?: number;
}

export interface ProjectCreate {
  project_name: string;
  client_name: string;
  start_date: string;
  final_deadline: string;
  products: ProjectProductItem[];
  stages: ProjectStageCreate[];
  sale_price?: number;
  sale_includes_tax: boolean;
}

export interface ProjectUpdate {
  project_name?: string;
  client_name?: string;
  start_date?: string;
  final_deadline?: string;
  sale_price?: number;
  sale_includes_tax?: boolean;
  products?: ProjectProductItem[];
  stages?: ProjectStageCreate[];
}

export interface ProjectStageUpdate {
  status?: string;
  qty_done?: number;
  actual_start_date?: string;
  actual_end_date?: string;
  notes?: string;
}

export interface ProjectMaterialRequirementUpdate {
  qty_per_unit?: number;
  qty_available?: number;
}

export interface ProjectMaterialPurchaseCreate {
  material_id: number;
  quantity_purchased: number;
  unit_cost: number;
  supplier_id?: number;
  purchase_date: string;
  notes?: string;
}

export interface ProjectMaterialPurchaseResponse {
  material_id: number;
  material_name: string;
  quantity_purchased: number;
  unit_cost: number;
  total_cost: number;
  qty_required: number;
  qty_remaining: number;
  inventory_updated: boolean;
}

export interface CompleteProjectResponse {
  message: string;
  inventory_tracked: boolean;
  products_updated?: Array<{
    product_id: number;
    product_name: string;
    quantity_added: number;
    new_inventory: number;
  }>;
}

export interface ProjectStageDetail {
  project_id: number;
  project_name: string;
  client_name: string;
  start_date: string | null;
  final_deadline: string | null;
  stage_id: number;
  stage_name: string;
  stage_status: string;
  is_purchasing_stage: boolean;
  qty_required: number;
  qty_done: number;
  planned_due_date: string;
  actual_ready_at: string | null;
  actual_started_at: string | null;
  actual_done_at: string | null;
  notes: string | null;
  products: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
  }>;
  materials: Array<{
    material_id: number;
    material_name: string;
    material_unit: string;
    qty_per_unit: number;
    qty_needed: number;
    qty_purchased: number;
    qty_remaining: number;
    inventory_available: number;
  }>;
}

export interface MaterialRequirement {
  requirement_id: number;
  material_id: number;
  material_name: string;
  material_unit: string;
  qty_per_unit: number;
  qty_total: number;
  qty_available: number;
  qty_to_buy: number;
}

export interface ProjectMaterialPurchaseCreate {
  material_id: number;
  quantity_purchased: number;
  unit_cost: number;
  supplier_id?: number;
  purchase_date: string;
  notes?: string;
}

export interface ProjectMaterialPurchaseResponse {
  material_id: number;
  material_name: string;
  quantity_purchased: number;
  unit_cost: number;
  total_cost: number;
  qty_required: number;
  qty_remaining: number;
  inventory_updated: boolean;
}

export interface CompleteProjectResponse {
  message: string;
  inventory_tracked: boolean;
  products_updated?: Array<{
    product_id: number;
    product_name: string;
    quantity_added: number;
    new_inventory: number;
  }>;
}

export interface ProjectStage {
  project_stage_id: number;
  stage_id: number;
  stage_name: string;
  status: string;
  qty_required: number | null;
  qty_done: number | null;
  planned_due_date: string;
  actual_started_at: string | null;
  actual_done_at: string | null;
  notes: string | null;
  stage_order: number;
  depends_on: number[];  // List of project_stage_ids this stage depends on
  has_operational_cost: boolean;
  cost_per_unit?: number;
}

export interface ProjectListItem {
  project_id: number;
  project_name: string;
  client_name: string;
  start_date: string;
  final_deadline: string;
  stages_count: number;
  completed_stages: number;
}

export interface ProjectDetail {
  project_id: number;
  project_name: string;
  client_name: string;
  start_date: string;
  final_deadline: string;
  stages: ProjectStage[];
  material_requirements: MaterialRequirement[];
  products: { product_id: number; product_name: string; quantity: number }[];
  sale_price?: number;
  sale_includes_tax: boolean;
}

const projectService = {
  async getAll(): Promise<ProjectListItem[]> {
    const response = await api.get('/projects/');
    return response.data;
  },

  async getById(id: number): Promise<ProjectDetail> {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async create(data: ProjectCreate): Promise<ProjectDetail> {
    const response = await api.post('/projects/', data);
    return response.data;
  },

  async update(id: number, data: ProjectUpdate): Promise<ProjectDetail> {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  async updateStage(projectId: number, stageId: number, data: ProjectStageUpdate): Promise<ProjectStage> {
    const response = await api.put(`/projects/${projectId}/stages/${stageId}`, data);
    return response.data;
  },

  async updateMaterialRequirement(
    projectId: number,
    requirementId: number,
    data: ProjectMaterialRequirementUpdate
  ): Promise<MaterialRequirement> {
    const response = await api.put(`/projects/${projectId}/materials/${requirementId}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async purchaseMaterialInStage(
    projectId: number,
    projectStageId: number,
    data: ProjectMaterialPurchaseCreate
  ): Promise<ProjectMaterialPurchaseResponse> {
    const response = await api.post(
      `/projects/${projectId}/stages/${projectStageId}/purchase-material/`,
      data
    );
    return response.data;
  },

  async completeProject(projectId: number): Promise<CompleteProjectResponse> {
    const response = await api.post(`/projects/${projectId}/complete/`);
    return response.data;
  },

  async getStageDetail(projectId: number, stageId: number): Promise<ProjectStageDetail> {
    const response = await api.get(`/projects/${projectId}/stages/${stageId}/detail`);
    return response.data;
  },

  async getStageEvents(projectId: number, stageId: number): Promise<StageEventLog[]> {
    const response = await api.get(`/projects/${projectId}/stages/${stageId}/events`);
    return response.data;
  },

  async getFinancialSummary(projectId: number): Promise<FinancialSummary> {
    const response = await api.get(`/projects/${projectId}/financial-summary`);
    return response.data;
  },

  async getMyWorkStages(): Promise<MyWorkStages> {
    const response = await api.get('/projects/my-work/stages');
    return response.data;
  },

  async getMyWorkStageDetail(projectStageId: number): Promise<any> {
    const response = await api.get(`/projects/my-work/stage/${projectStageId}`);
    return response.data;
  },

  async updateMyWorkStage(projectStageId: number, data: ProjectStageUpdate): Promise<any> {
    const response = await api.put(`/projects/my-work/stage/${projectStageId}`, data);
    return response.data;
  },
};

export interface StageEventLog {
  id: number;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  user_name: string;
  timestamp: string;
  notes: string | null;
}

export interface FinancialSummary {
  project_id: number;
  project_name: string;
  sale_price: number;
  sale_includes_tax: boolean;
  iva_breakdown?: {
    base_price: number;
    iva_amount: number;
    iva_percentage: number;
  };
  material_costs: number;
  material_breakdown: Array<{
    material_name: string;
    total_quantity: number;
    unit: string;
    total_cost: number;
  }>;
  operational_costs: number;
  operational_breakdown: Array<{
    stage_name: string;
    cost_per_unit: number;
    qty_done: number;
    total_cost: number;
  }>;
  total_costs: number;
  estimated_profit: number;
  profit_margin_percent: number;
}

export interface WorkStageItem {
  project_stage_id: number;
  project_id: number;
  project_name: string;
  client_name: string;
  stage_id: number;
  stage_name: string;
  status: string;
  qty_required: number;
  qty_done: number;
  progress: number;
  deadline: string | null;
  days_to_deadline: number | null;
  deadline_status: string;
  actual_started_at: string | null;
  actual_done_at: string | null;
}

export interface MyWorkStages {
  blocked: WorkStageItem[];
  ready: WorkStageItem[];
  in_progress: WorkStageItem[];
  completed: WorkStageItem[];
}

export default projectService;
