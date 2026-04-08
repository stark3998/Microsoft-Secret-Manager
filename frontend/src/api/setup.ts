import axios from 'axios';

/**
 * Setup API client — uses plain axios (no MSAL auth) because the setup
 * endpoints are public and run before authentication is configured.
 */
const setupClient = axios.create({
  baseURL: '/api/setup',
  headers: { 'Content-Type': 'application/json' },
});

export interface SetupStatus {
  isConfigured: boolean;
  storageMode: string;
  storageReady: boolean;
  cosmosConnected: boolean;
  cosmosEndpoint: string;
  localMode: boolean;
  hasAppConfig: boolean;
  azureConfigured: boolean;
  msalConfigured: boolean;
}

export interface FrontendConfig {
  configured: boolean;
  clientId?: string;
  tenantId?: string;
  authority?: string;
}

export interface CosmosValidateRequest {
  endpoint: string;
  key?: string;
  database?: string;
  use_managed_identity?: boolean;
}

export interface CosmosValidateResponse {
  success: boolean;
  message: string;
  databases?: string[];
}

export interface InitializeRequest {
  storage_mode: 'cosmos' | 'local';
  cosmos_endpoint?: string;
  cosmos_key?: string;
  cosmos_database?: string;
  cosmos_use_managed_identity?: boolean;
  azure_tenant_id: string;
  azure_client_id: string;
  azure_client_secret?: string;
  azure_environment?: string;
  managed_identity_client_id?: string;
  msal_client_id?: string;
}

export interface GenerateEnvResponse {
  content: string;
}

export const fetchSetupStatus = (): Promise<SetupStatus> =>
  setupClient.get('/status').then((r) => r.data);

export const fetchFrontendConfig = (): Promise<FrontendConfig> =>
  setupClient.get('/frontend-config').then((r) => r.data);

export const validateCosmos = (data: CosmosValidateRequest): Promise<CosmosValidateResponse> =>
  setupClient.post('/validate-cosmos', data).then((r) => r.data);

export const initializeApp = (data: InitializeRequest) =>
  setupClient.post('/initialize', data).then((r) => r.data);

export const generateEnv = (data: InitializeRequest): Promise<GenerateEnvResponse> =>
  setupClient.post('/generate-env', data).then((r) => r.data);
