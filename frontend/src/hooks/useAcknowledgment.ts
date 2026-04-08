import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acknowledgeItem, snoozeItem, unacknowledgeItem } from '../api/acknowledgment';
import type { AcknowledgeRequest, SnoozeRequest } from '../types';

export function useAcknowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AcknowledgeRequest) => acknowledgeItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyvault-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSnooze() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SnoozeRequest) => snoozeItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyvault-items'] });
    },
  });
}

export function useUnacknowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AcknowledgeRequest) => unacknowledgeItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyvault-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
