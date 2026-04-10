import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAppInventory, fetchInventorySummary, fetchAppDetail, fetchAppSignIns,
  fetchAppGraphRaw, disableApp, enableApp, bulkDisableApps,
  type InventoryParams,
} from '../api/appInventory';

export function useAppInventory(params: InventoryParams) {
  return useQuery({
    queryKey: ['app-inventory', params],
    queryFn: () => fetchAppInventory(params),
  });
}

export function useInventorySummary() {
  return useQuery({
    queryKey: ['app-inventory-summary'],
    queryFn: fetchInventorySummary,
  });
}

export function useAppDetail(appId: string) {
  return useQuery({
    queryKey: ['app-inventory', appId],
    queryFn: () => fetchAppDetail(appId),
    enabled: !!appId,
  });
}

export function useAppSignIns(appId: string, days?: number) {
  return useQuery({
    queryKey: ['app-sign-ins', appId, days],
    queryFn: () => fetchAppSignIns(appId, days),
    enabled: !!appId,
  });
}

export function useAppGraphRaw(appId: string) {
  return useQuery({
    queryKey: ['app-graph-raw', appId],
    queryFn: () => fetchAppGraphRaw(appId),
    enabled: !!appId,
  });
}

export function useDisableApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => disableApp(appId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-inventory'] });
      qc.invalidateQueries({ queryKey: ['app-inventory-summary'] });
    },
  });
}

export function useEnableApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => enableApp(appId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-inventory'] });
      qc.invalidateQueries({ queryKey: ['app-inventory-summary'] });
    },
  });
}

export function useBulkDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appIds: string[]) => bulkDisableApps(appIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-inventory'] });
      qc.invalidateQueries({ queryKey: ['app-inventory-summary'] });
    },
  });
}
