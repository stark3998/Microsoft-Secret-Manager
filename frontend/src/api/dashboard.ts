import apiClient from './client';
import type { DashboardOverview, TimelineItem } from '../types';

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const { data } = await apiClient.get('/dashboard/overview');
  return data;
}

export async function fetchTimeline(): Promise<{ items: TimelineItem[]; count: number }> {
  const { data } = await apiClient.get('/dashboard/timeline');
  return data;
}
