import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  issueCertificate,
  renewCertificate,
  revokeCertificate,
  checkRenewals,
} from '../api/certificates';
import { listDnsProviders, listAllZones } from '../api/dns';
import type {
  IssueCertificateRequest,
  RenewCertificateRequest,
  RevokeCertificateRequest,
} from '../types';

export function useDnsProviders() {
  return useQuery({
    queryKey: ['dns-providers'],
    queryFn: listDnsProviders,
  });
}

export function useDnsZones() {
  return useQuery({
    queryKey: ['dns-zones'],
    queryFn: listAllZones,
  });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IssueCertificateRequest) => issueCertificate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyvault-items'] });
    },
    onError: (error: Error) => { console.error('Issue certificate failed:', error.message); },
  });
}

export function useRenewCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenewCertificateRequest) => renewCertificate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyvault-items'] });
    },
    onError: (error: Error) => { console.error('Renew certificate failed:', error.message); },
  });
}

export function useRevokeCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RevokeCertificateRequest) => revokeCertificate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyvault-items'] });
    },
    onError: (error: Error) => { console.error('Revoke certificate failed:', error.message); },
  });
}

export function useCheckRenewals() {
  return useMutation({
    mutationFn: checkRenewals,
    onError: (error: Error) => { console.error('Check renewals failed:', error.message); },
  });
}
