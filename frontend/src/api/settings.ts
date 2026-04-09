import apiClient from './client';
import type { AppSettings, AppConfig } from '../types';

export async function fetchSettings(): Promise<AppSettings> {
  const { data } = await apiClient.get('/settings');
  return data;
}

export async function updateThresholds(tiers: AppSettings['thresholds']['tiers']): Promise<void> {
  await apiClient.put('/settings/thresholds', { tiers });
}

export async function updateNotifications(settings: Partial<AppSettings['notifications']>): Promise<void> {
  await apiClient.put('/settings/notifications', settings);
}

export async function updateSchedule(settings: Partial<AppSettings['schedule']>): Promise<void> {
  await apiClient.put('/settings/schedule', settings);
}

export async function fetchAppConfig(): Promise<AppConfig> {
  const { data } = await apiClient.get('/settings/app-config');
  return data;
}

export async function updateAppConfig(config: Partial<AppConfig>): Promise<AppConfig> {
  const { data } = await apiClient.put('/settings/app-config', config);
  return data;
}
