import apiClient from './client';
import { msalInstance } from '../auth/AuthProvider';
import { authDisabledMode } from '../auth/useAuth';
import type { ScanRun } from '../types';

export interface DelegatedTokens {
  graph?: string;
  management?: string;
  keyvault?: string;
}

/**
 * Acquire delegated tokens for Azure resources via MSAL.
 * Returns tokens for Graph, ARM, and Key Vault that the backend
 * can use to scan on behalf of the logged-in user.
 */
export async function acquireDelegatedTokens(): Promise<DelegatedTokens> {
  if (authDisabledMode || !msalInstance) {
    throw new Error('Delegated credentials require MSAL authentication');
  }

  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) throw new Error('No signed-in account');

  const acquire = async (scopes: string[]): Promise<string | undefined> => {
    try {
      const res = await msalInstance!.acquireTokenSilent({ scopes, account });
      return res.accessToken;
    } catch {
      try {
        const res = await msalInstance!.acquireTokenPopup({ scopes, account });
        return res.accessToken;
      } catch {
        return undefined;
      }
    }
  };

  // Acquire tokens sequentially (popups can't overlap)
  const graph = await acquire(['https://graph.microsoft.com/.default']);
  const management = await acquire(['https://management.azure.com/user_impersonation']);
  const keyvault = await acquire(['https://vault.azure.net/user_impersonation']);

  if (!graph && !management && !keyvault) {
    throw new Error(
      'Could not acquire any delegated tokens. Ensure your app registration ' +
      'has API permissions for Microsoft Graph, Azure Service Management, ' +
      'and/or Azure Key Vault.'
    );
  }

  return { graph, management, keyvault };
}

export async function triggerScan(useDelegated = false): Promise<{ status: string; message: string }> {
  let delegatedTokens: DelegatedTokens | undefined;

  if (useDelegated) {
    delegatedTokens = await acquireDelegatedTokens();
  }

  const { data } = await apiClient.post('/scans/trigger', {
    delegatedTokens: delegatedTokens || null,
  });
  return data;
}

export async function fetchScanHistory(page = 1, pageSize = 10): Promise<{ items: ScanRun[]; page: number; pageSize: number }> {
  const { data } = await apiClient.get('/scans/history', { params: { page, page_size: pageSize } });
  return data;
}

export async function fetchLatestScan(): Promise<ScanRun | null> {
  const { data } = await apiClient.get('/scans/latest');
  return data;
}
