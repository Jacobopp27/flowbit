import api from './api';

export interface MaterialPurchaseCreate {
  material_id: number;
  quantity: number;
  unit_cost: number;
  supplier_id?: number;
  purchase_date: string; // ISO date string
  notes?: string;
}

export interface MaterialPurchase {
  purchase_id: number;
  company_id: number;
  material_id: number;
  material_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier_id?: number;
  supplier_name?: string;
  purchase_date: string;
  notes?: string;
  created_at: string;
}

export const purchasesService = {
  async createPurchase(data: MaterialPurchaseCreate): Promise<MaterialPurchase> {
    const response = await api.post('/purchases/', data);
    return response.data;
  },

  async listPurchases(skip = 0, limit = 100): Promise<MaterialPurchase[]> {
    const response = await api.get('/purchases/', {
      params: { skip, limit }
    });
    return response.data;
  },
};
