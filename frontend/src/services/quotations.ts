import api from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type QuotationStatus = 'borrador' | 'enviada' | 'aprobada';

export interface SizesBreakdown {
  [key: string]: number; // e.g. { "XS": 5, "S": 10 } or { "total": 20 }
}

export interface QuotationItem {
  id?: number;
  quotation_id?: number;
  product_id?: number | null;
  product_name?: string | null;
  reference: string;
  description?: string;
  has_sizes: boolean;
  design_image_path?: string | null;
  sizes_breakdown: SizesBreakdown;
  unit_price?: number | null;
  notes?: string;
  order: number;
  material_overrides?: Record<string, { color?: string; code?: string }> | null;
}

export interface QuotationOut {
  id: number;
  number: string;
  status: QuotationStatus;
  client_name: string;
  client_nit?: string;
  client_contact?: string;
  client_phone?: string;
  client_email?: string;
  event_name?: string;
  delivery_date?: string;
  iva_rate: number;
  discount: number;
  gift_note?: string;
  observations?: string;
  payment_conditions?: string;
  molderia?: string;
  design_image_path?: string;
  items: QuotationItem[];
  created_at: string;
  updated_at: string;
  project_id?: number | null;
}

export interface QuotationListItem {
  id: number;
  number: string;
  status: QuotationStatus;
  client_name: string;
  event_name?: string;
  delivery_date?: string;
  total_items: number;
  created_at: string;
  project_id?: number | null;
}

export interface QuotationCreate {
  client_name: string;
  client_nit?: string;
  client_contact?: string;
  client_phone?: string;
  client_email?: string;
  event_name?: string;
  delivery_date?: string;
  iva_rate?: number;
  discount?: number;
  gift_note?: string;
  observations?: string;
  payment_conditions?: string;
  molderia?: string;
  items: Omit<QuotationItem, 'id' | 'quotation_id' | 'product_name'>[];
}

export interface GenerateOrdersRequest {
  template_id?: number;
  stage_ids?: number[];
  stage_dates?: Record<number, string>;
  tailor_name?: string;
  tailor_price_per_unit?: number;
  notes?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const quotationsApi = {
  list: () =>
    api.get<QuotationListItem[]>('/quotations/').then((r) => r.data),

  get: (id: number) =>
    api.get<QuotationOut>(`/quotations/${id}`).then((r) => r.data),

  create: (payload: QuotationCreate) =>
    api.post<QuotationOut>('/quotations/', payload).then((r) => r.data),

  update: (id: number, payload: Partial<QuotationCreate>) =>
    api.put<QuotationOut>(`/quotations/${id}`, payload).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/quotations/${id}`),

  updateStatus: (id: number, status: QuotationStatus) =>
    api.patch<QuotationOut>(`/quotations/${id}/status`, { status }).then((r) => r.data),

  generateOrders: (id: number, payload: GenerateOrdersRequest) =>
    api.post<{ project_id: number; message: string }>(
      `/quotations/${id}/generate-orders`,
      payload
    ).then((r) => r.data),

  // PDF downloads — return blob URL
  downloadQuotationPdf: (id: number, number: string) =>
    api.get(`/quotations/${id}/pdf`, { responseType: 'blob' }).then((r) => {
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }),

  downloadCuttingOrderPdf: (id: number) =>
    api.get(`/quotations/${id}/cutting-order-pdf`, { responseType: 'blob' }).then((r) => {
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `OC-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }),

  downloadPurchaseOrderPdf: (id: number) =>
    api.get(`/quotations/${id}/purchase-order-pdf`, { responseType: 'blob' }).then((r) => {
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `OCP-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }),

  downloadProductionSheetPdf: (id: number, tailorName = '', tailorPrice = 0) =>
    api
      .get(`/quotations/${id}/production-sheet-pdf`, {
        responseType: 'blob',
        params: { tailor_name: tailorName, tailor_price: tailorPrice },
      })
      .then((r) => {
        const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `FP-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }),

  uploadDesignImage: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<{ design_image_path: string }>(`/quotations/${id}/design-image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  uploadItemDesignImage: (quotationId: number, itemId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<{ item_id: number; design_image_path: string }>(
        `/quotations/${quotationId}/items/${itemId}/design-image`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      .then((r) => r.data);
  },
};
