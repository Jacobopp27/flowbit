import api from './api';

export interface ProductInventoryItem {
  id: number;
  company_id: number;
  product_id: number;
  product_name: string;
  qty_available: number;
}

export const inventoryService = {
  async getProductInventory(): Promise<ProductInventoryItem[]> {
    const response = await api.get('/inventory/products/');
    return response.data;
  },

  async getMaterialInventory(): Promise<any[]> {
    // Materials inventory is just materials with qty_available
    const response = await api.get('/materials/');
    return response.data;
  },
};
