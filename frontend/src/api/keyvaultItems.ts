import apiClient from './client';
import type { PaginatedResponse, KeyVaultItem, SubscriptionInfo, VaultInfo } from '../types';

export interface KeyVaultItemsParams {
  subscription?: string;
  vault?: string;
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchKeyVaultItems(params: KeyVaultItemsParams = {}): Promise<PaginatedResponse<KeyVaultItem>> {
  const { data } = await apiClient.get('/keyvault-items', { params: { page_size: params.pageSize, ...params } });
  return data;
}

export async function fetchKeyVaultItem(id: string): Promise<KeyVaultItem> {
  const { data } = await apiClient.get(`/keyvault-items/${id}`);
  return data;
}

export async function fetchSubscriptions(): Promise<SubscriptionInfo[]> {
  const { data } = await apiClient.get('/keyvault-items/subscriptions');
  return data;
}

export async function fetchVaults(subscription?: string): Promise<VaultInfo[]> {
  const { data } = await apiClient.get('/keyvault-items/vaults', { params: { subscription } });
  return data;
}

export async function createKeyVaultItem(body: Record<string, unknown>): Promise<KeyVaultItem> {
  const { data } = await apiClient.post('/keyvault-items', body);
  return data;
}

export async function updateKeyVaultItem(id: string, body: Record<string, unknown>): Promise<KeyVaultItem> {
  const { data } = await apiClient.put(`/keyvault-items/${id}`, body);
  return data;
}

export async function deleteKeyVaultItem(id: string): Promise<void> {
  await apiClient.delete(`/keyvault-items/${id}`);
}
