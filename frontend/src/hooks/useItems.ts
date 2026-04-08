import { useQuery } from '@tanstack/react-query';
import { fetchKeyVaultItems, fetchSubscriptions, fetchVaults, type KeyVaultItemsParams } from '../api/keyvaultItems';
import { fetchAppRegistrations, type AppRegParams } from '../api/appRegistrations';
import { fetchEnterpriseApps, type EntAppParams } from '../api/enterpriseApps';

export function useKeyVaultItems(params: KeyVaultItemsParams) {
  return useQuery({
    queryKey: ['keyvault-items', params],
    queryFn: () => fetchKeyVaultItems(params),
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions,
  });
}

export function useVaults(subscription?: string) {
  return useQuery({
    queryKey: ['vaults', subscription],
    queryFn: () => fetchVaults(subscription),
  });
}

export function useAppRegistrations(params: AppRegParams) {
  return useQuery({
    queryKey: ['app-registrations', params],
    queryFn: () => fetchAppRegistrations(params),
  });
}

export function useEnterpriseApps(params: EntAppParams) {
  return useQuery({
    queryKey: ['enterprise-apps', params],
    queryFn: () => fetchEnterpriseApps(params),
  });
}
