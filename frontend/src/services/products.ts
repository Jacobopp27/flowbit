import api from './api';

export interface ProductBOMItem {
  id: number;
  product_id: number;
  material_id: number;
  qty_per_unit: number;
}

export interface ProductBOMItemCreate {
  material_id: number;
  qty_per_unit: number;
}

export interface Product {
  id: number;
  company_id: number;
  name: string;
  sku?: string;
  created_at: string;
  bom_items: ProductBOMItem[];
}

export interface ProductCreate {
  name: string;
  product_name: string;
  sku?: string;
  bom_items: ProductBOMItemCreate[];
}

export interface ProductUpdate {
  product_name?: string;
  sku?: string;
  bom_items?: ProductBOMItemCreate[];
}

const productService = {
  getAll: async (): Promise<Product[]> => {
    const response = await api.get<Product[]>('/products/');
    return response.data;
  },

  getById: async (id: number): Promise<Product> => {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },

  create: async (data: ProductCreate): Promise<Product> => {
    const response = await api.post<Product>('/products/', data);
    return response.data;
  },

  update: async (id: number, data: ProductUpdate): Promise<Product> => {
    const response = await api.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
};

export default productService;
