import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchKeyVaultItems, fetchSubscriptions, fetchVaults, createKeyVaultItem, updateKeyVaultItem, deleteKeyVaultItem, type KeyVaultItemsParams } from '../api/keyvaultItems';
import { fetchAppRegistrations, createAppRegistration, updateAppRegistration, deleteAppRegistration, type AppRegParams } from '../api/appRegistrations';
import { fetchEnterpriseApps, createEnterpriseApp, updateEnterpriseApp, deleteEnterpriseApp, type EntAppParams } from '../api/enterpriseApps';

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

// -- Mutations --

export function useCreateKeyVaultItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createKeyVaultItem(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['keyvault-items'] }); },
  });
}

export function useUpdateKeyVaultItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => updateKeyVaultItem(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['keyvault-items'] }); },
  });
}

export function useDeleteKeyVaultItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteKeyVaultItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['keyvault-items'] }); },
  });
}

export function useCreateAppRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createAppRegistration(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-registrations'] }); },
  });
}

export function useUpdateAppRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => updateAppRegistration(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-registrations'] }); },
  });
}

export function useDeleteAppRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAppRegistration(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-registrations'] }); },
  });
}

export function useCreateEnterpriseApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createEnterpriseApp(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enterprise-apps'] }); },
  });
}

export function useUpdateEnterpriseApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => updateEnterpriseApp(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enterprise-apps'] }); },
  });
}

export function useDeleteEnterpriseApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEnterpriseApp(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enterprise-apps'] }); },
  });
}
