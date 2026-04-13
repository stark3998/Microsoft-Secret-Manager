import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchRotations,
  fetchRotation,
  fetchEligibleApps,
  initiateRotation,
  activateRotation,
  cancelRotation,
  runRotationCycle,
} from '../api/samlRotation';
import type { InitiateRotationRequest } from '../types';

export function useRotations(params: { status?: string; sp_id?: string } = {}) {
  return useQuery({
    queryKey: ['saml-rotations', params],
    queryFn: () => fetchRotations(params),
  });
}

export function useRotation(id: string) {
  return useQuery({
    queryKey: ['saml-rotation', id],
    queryFn: () => fetchRotation(id),
    enabled: !!id,
  });
}

export function useEligibleApps() {
  return useQuery({
    queryKey: ['saml-rotation-eligible'],
    queryFn: fetchEligibleApps,
  });
}

export function useInitiateRotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InitiateRotationRequest) => initiateRotation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saml-rotations'] });
      queryClient.invalidateQueries({ queryKey: ['saml-rotation-eligible'] });
    },
    onError: (error: Error) => { console.error('Initiate rotation failed:', error.message); },
  });
}

export function useActivateRotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rotationId: string) => activateRotation(rotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saml-rotations'] });
    },
    onError: (error: Error) => { console.error('Activate rotation failed:', error.message); },
  });
}

export function useCancelRotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rotationId: string) => cancelRotation(rotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saml-rotations'] });
      queryClient.invalidateQueries({ queryKey: ['saml-rotation-eligible'] });
    },
    onError: (error: Error) => { console.error('Cancel rotation failed:', error.message); },
  });
}

export function useRunRotationCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runRotationCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saml-rotations'] });
      queryClient.invalidateQueries({ queryKey: ['saml-rotation-eligible'] });
    },
    onError: (error: Error) => { console.error('Run rotation cycle failed:', error.message); },
  });
}
