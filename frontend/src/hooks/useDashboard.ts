import { useQuery } from '@tanstack/react-query';
import { fetchDashboardOverview, fetchTimeline } from '../api/dashboard';

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: fetchDashboardOverview,
    refetchInterval: 60000,
  });
}

export function useTimeline() {
  return useQuery({
    queryKey: ['dashboard', 'timeline'],
    queryFn: fetchTimeline,
  });
}
