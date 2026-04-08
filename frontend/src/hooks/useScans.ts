import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { triggerScan, fetchScanHistory, fetchLatestScan } from '../api/scans';

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
    refetchInterval: 30000,
  });
}

export function useTriggerScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
    },
  });
}
