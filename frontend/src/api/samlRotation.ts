import apiClient from './client';
import type { InitiateRotationRequest } from '../types';

export const fetchRotations = (params: { status?: string; sp_id?: string }) =>
  apiClient.get('/saml-rotation', { params }).then((r) => r.data);

export const fetchRotation = (id: string) =>
  apiClient.get(`/saml-rotation/${id}`).then((r) => r.data);

export const fetchEligibleApps = () =>
  apiClient.get('/saml-rotation/eligible').then((r) => r.data);

export const initiateRotation = (data: InitiateRotationRequest) =>
  apiClient.post('/saml-rotation/initiate', data).then((r) => r.data);

export const activateRotation = (rotationId: string) =>
  apiClient.post('/saml-rotation/activate', { rotation_id: rotationId }).then((r) => r.data);

export const cancelRotation = (rotationId: string) =>
  apiClient.post('/saml-rotation/cancel', { rotation_id: rotationId }).then((r) => r.data);

export const runRotationCycle = () =>
  apiClient.post('/saml-rotation/run-cycle').then((r) => r.data);
