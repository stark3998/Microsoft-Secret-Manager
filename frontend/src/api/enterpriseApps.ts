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

export async function createEnterpriseApp(body: Record<string, unknown>): Promise<EnterpriseAppItem> {
  const { data } = await apiClient.post('/enterprise-apps', body);
  return data;
}

export async function updateEnterpriseApp(id: string, body: Record<string, unknown>): Promise<EnterpriseAppItem> {
  const { data } = await apiClient.put(`/enterprise-apps/${id}`, body);
  return data;
}

export async function deleteEnterpriseApp(id: string): Promise<void> {
  await apiClient.delete(`/enterprise-apps/${id}`);
}
