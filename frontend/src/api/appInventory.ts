import apiClient from './client';
import { msalInstance } from '../auth/AuthProvider';
import { authDisabledMode } from '../auth/useAuth';
import type { PaginatedResponse, AppInventoryRecord, InventorySummary, AppSignInRecord } from '../types';

/**
 * Acquire a Graph-scoped token from MSAL and return it.
 * Returns undefined in auth-disabled mode or if acquisition fails.
 */
async function getGraphToken(): Promise<string | undefined> {
  if (authDisabledMode || !msalInstance) return undefined;
  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) return undefined;
  try {
    const res = await msalInstance.acquireTokenSilent({
      scopes: ['https://graph.microsoft.com/.default'],
      account,
    });
    return res.accessToken;
  } catch {
    try {
      const res = await msalInstance.acquireTokenPopup({
        scopes: ['https://graph.microsoft.com/.default'],
        account,
      });
      return res.accessToken;
    } catch {
      return undefined;
    }
  }
}

/** Build headers with Graph token for on-demand Graph API calls. */
async function graphHeaders(): Promise<Record<string, string>> {
  const token = await getGraphToken();
  return token ? { 'X-Graph-Token': token } : {};
}

export interface InventoryParams {
  classification?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchAppInventory(params: InventoryParams = {}): Promise<PaginatedResponse<AppInventoryRecord>> {
  const { data } = await apiClient.get('/app-inventory', {
    params: { page_size: params.pageSize, sort_by: params.sortBy, sort_order: params.sortOrder, ...params },
  });
  return data;
}

export async function fetchInventorySummary(): Promise<InventorySummary> {
  const { data } = await apiClient.get('/app-inventory/summary');
  return data;
}

export async function fetchAppDetail(appId: string): Promise<AppInventoryRecord> {
  const { data } = await apiClient.get(`/app-inventory/${appId}`);
  return data;
}

export async function fetchAppSignIns(appId: string, days?: number): Promise<{ items: AppSignInRecord[]; count: number }> {
  const headers = await graphHeaders();
  const { data } = await apiClient.get(`/app-inventory/${appId}/sign-ins`, { params: { days }, headers });
  return data;
}

export async function fetchAppGraphRaw(appId: string): Promise<Record<string, unknown>> {
  const headers = await graphHeaders();
  const { data } = await apiClient.get(`/app-inventory/${appId}/graph-raw`, { headers });
  return data;
}

export async function disableApp(appId: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post(`/app-inventory/${appId}/disable`);
  return data;
}

export async function enableApp(appId: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post(`/app-inventory/${appId}/enable`);
  return data;
}

export async function bulkDisableApps(appIds: string[]): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/app-inventory/bulk-disable', { app_ids: appIds });
  return data;
}

export async function fetchDisableActions(): Promise<PaginatedResponse<Record<string, unknown>>> {
  const { data } = await apiClient.get('/app-inventory/actions/history');
  return data;
}
