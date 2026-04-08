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
