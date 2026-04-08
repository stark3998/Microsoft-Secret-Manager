import apiClient from './client';

export const listDnsProviders = () =>
  apiClient.get('/dns/providers').then((r) => r.data);

export const listAllZones = () =>
  apiClient.get('/dns/zones').then((r) => r.data);

export const listZonesForProvider = (providerKey: string) =>
  apiClient.get(`/dns/zones/${providerKey}`).then((r) => r.data);
