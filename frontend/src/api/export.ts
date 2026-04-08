import apiClient from './client';

export const exportCsv = (params?: Record<string, string>) =>
  apiClient
    .get('/export/csv', { params, responseType: 'blob' })
    .then((r) => r.data);

export const exportPdf = (params?: Record<string, string>) =>
  apiClient
    .get('/export/pdf', { params, responseType: 'blob' })
    .then((r) => r.data);
