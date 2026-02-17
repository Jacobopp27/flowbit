import api from './api';

export interface CompanySettings {
  company_id: number;
  company_name: string;
  track_raw_materials_inventory: boolean;
  track_finished_products_inventory: boolean;
}

export interface CompanySettingsUpdate {
  track_raw_materials_inventory?: boolean;
  track_finished_products_inventory?: boolean;
}

export const settingsService = {
  async getSettings(): Promise<CompanySettings> {
    const response = await api.get('/settings/');
    return response.data;
  },

  async updateSettings(data: CompanySettingsUpdate): Promise<CompanySettings> {
    const response = await api.patch('/settings/', data);
    return response.data;
  },
};
