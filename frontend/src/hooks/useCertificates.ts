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
  });
}

export function useRenewCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenewCertificateRequest) => renewCertificate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyvault-items'] });
    },
  });
}

export function useRevokeCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RevokeCertificateRequest) => revokeCertificate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyvault-items'] });
    },
  });
}

export function useCheckRenewals() {
  return useMutation({
    mutationFn: checkRenewals,
  });
}
