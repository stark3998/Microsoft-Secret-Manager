import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSettings, updateThresholds, updateNotifications, updateSchedule, fetchAppConfig, updateAppConfig } from '../api/settings';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });
}

export function useUpdateThresholds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateThresholds,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useUpdateNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNotifications,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useAppConfig() {
  return useQuery({
    queryKey: ['appConfig'],
    queryFn: fetchAppConfig,
  });
}

export function useUpdateAppConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAppConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appConfig'] }),
  });
}
