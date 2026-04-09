import apiClient from './client';
import type { PaginatedResponse, AppRegistrationItem } from '../types';

export interface AppRegParams {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchAppRegistrations(params: AppRegParams = {}): Promise<PaginatedResponse<AppRegistrationItem>> {
  const { data } = await apiClient.get('/app-registrations', { params: { page_size: params.pageSize, ...params } });
  return data;
}

export async function fetchAppRegistration(id: string): Promise<AppRegistrationItem> {
  const { data } = await apiClient.get(`/app-registrations/${id}`);
  return data;
}

export async function createAppRegistration(body: Record<string, unknown>): Promise<AppRegistrationItem> {
  const { data } = await apiClient.post('/app-registrations', body);
  return data;
}

export async function updateAppRegistration(id: string, body: Record<string, unknown>): Promise<AppRegistrationItem> {
  const { data } = await apiClient.put(`/app-registrations/${id}`, body);
  return data;
}

export async function deleteAppRegistration(id: string): Promise<void> {
  await apiClient.delete(`/app-registrations/${id}`);
}
