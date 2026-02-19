import api from './api';

export interface ProductInventoryItem {
  id: number;
  company_id: number;
  product_id: number;
  product_name: string;
  qty_available: number;
}

export interface ProductSale {
  id: number;
  company_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  customer_name: string | null;
  sale_date: string;
  notes: string | null;
  created_at: string;
}

export interface ProductSaleCreate {
  product_id: number;
  quantity: number;
  unit_price: number;
  customer_name?: string;
  sale_date: string;
  notes?: string;
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

  async getProductSales(): Promise<ProductSale[]> {
    const response = await api.get('/inventory/products/sales');
    return response.data;
  },

  async registerSale(saleData: ProductSaleCreate): Promise<ProductSale> {
    const response = await api.post('/inventory/products/sales', saleData);
    return response.data;
  },
};
