import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { triggerScan, fetchScanHistory, fetchLatestScan, fetchActiveScan } from '../api/scans';

export function useScanHistory(page = 1) {
  return useQuery({
    queryKey: ['scans', 'history', page],
    queryFn: () => fetchScanHistory(page),
  });
}

export function useLatestScan() {
  return useQuery({
    queryKey: ['scans', 'latest'],
    queryFn: fetchLatestScan,
    refetchInterval: 50000,
  });
}

export function useActiveScan() {
  return useQuery({
    queryKey: ['scans', 'active'],
    queryFn: fetchActiveScan,
    refetchInterval: 5000,
  });
}

export function useTriggerScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (useDelegated: boolean = false) => triggerScan(useDelegated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
    },
  });
}
