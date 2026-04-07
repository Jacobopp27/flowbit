import api from './api';

export type ImportStatus = 'new' | 'exists' | 'error';

export interface SupplierPreview {
  row: number;
  nombre: string;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  status: ImportStatus;
  message: string;
}

export interface MaterialPreview {
  row: number;
  nombre: string;
  unidad: string;
  proveedor: string | null;
  status: ImportStatus;
  message: string;
}

export interface ProductBOMPreview {
  material: string;
  cantidad: number;
}

export interface ProductPreview {
  nombre: string;
  sku: string | null;
  status: ImportStatus;
  message: string;
  bom_items: ProductBOMPreview[];
}

export interface PreviewResult {
  suppliers: SupplierPreview[];
  materials: MaterialPreview[];
  products: ProductPreview[];
}

export interface ImportResult {
  success: boolean;
  created: { suppliers: number; materials: number; products: number };
  skipped: { suppliers: number; materials: number; products: number };
}

const importService = {
  downloadTemplate: async (): Promise<void> => {
    const response = await api.get('/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_flowbit.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  preview: async (file: File): Promise<PreviewResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<PreviewResult>('/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  confirm: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImportResult>('/import/confirm', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default importService;
