import apiClient from './client';
import type {
  IssueCertificateRequest,
  RenewCertificateRequest,
  RevokeCertificateRequest,
} from '../types';

export const issueCertificate = (data: IssueCertificateRequest) =>
  apiClient.post('/certificates/issue', data).then((r) => r.data);

export const renewCertificate = (data: RenewCertificateRequest) =>
  apiClient.post('/certificates/renew', data).then((r) => r.data);

export const revokeCertificate = (data: RevokeCertificateRequest) =>
  apiClient.post('/certificates/revoke', data).then((r) => r.data);

export const checkRenewals = () =>
  apiClient.post('/certificates/check-renewals').then((r) => r.data);
