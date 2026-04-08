import apiClient from './client';
import type { AcknowledgeRequest, SnoozeRequest } from '../types';

export const acknowledgeItem = (data: AcknowledgeRequest) =>
  apiClient.post('/items/acknowledge', data).then((r) => r.data);

export const snoozeItem = (data: SnoozeRequest) =>
  apiClient.post('/items/snooze', data).then((r) => r.data);

export const unacknowledgeItem = (data: AcknowledgeRequest) =>
  apiClient.post('/items/unacknowledge', data).then((r) => r.data);
