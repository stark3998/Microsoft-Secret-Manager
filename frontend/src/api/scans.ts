import apiClient from './client';
import type { ScanRun } from '../types';

export async function triggerScan(): Promise<{ status: string; message: string }> {
  const { data } = await apiClient.post('/scans/trigger');
  return data;
}

export async function fetchScanHistory(page = 1, pageSize = 10): Promise<{ items: ScanRun[]; page: number; pageSize: number }> {
  const { data } = await apiClient.get('/scans/history', { params: { page, page_size: pageSize } });
  return data;
}

export async function fetchLatestScan(): Promise<ScanRun | null> {
  const { data } = await apiClient.get('/scans/latest');
  return data;
}
