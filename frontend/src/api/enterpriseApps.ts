import apiClient from './client';
import type { PaginatedResponse, EnterpriseAppItem } from '../types';

export interface EntAppParams {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchEnterpriseApps(params: EntAppParams = {}): Promise<PaginatedResponse<EnterpriseAppItem>> {
  const { data } = await apiClient.get('/enterprise-apps', { params: { page_size: params.pageSize, ...params } });
  return data;
}

export async function fetchEnterpriseApp(id: string): Promise<EnterpriseAppItem> {
  const { data } = await apiClient.get(`/enterprise-apps/${id}`);
  return data;
}
