import { Configuration, LogLevel } from '@azure/msal-browser';

/**
 * MSAL configuration.
 *
 * Values come from VITE_ env vars when available, or are updated at runtime
 * by `updateMsalConfig()` after fetching from the backend `/api/setup/frontend-config`.
 */

let _clientId = import.meta.env.VITE_AZURE_CLIENT_ID || '';
let _tenantId = import.meta.env.VITE_AZURE_TENANT_ID || '';
let _authority = _tenantId
  ? `https://login.microsoftonline.com/${_tenantId}`
  : '';

export function getMsalConfig(): Configuration {
  return {
    auth: {
      clientId: _clientId,
      authority: _authority || `https://login.microsoftonline.com/${_tenantId || 'common'}`,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Warning,
      },
    },
  };
}

/** Scopes for the initial login — just basic OpenID scopes. */
export let loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};

/** Scopes for acquiring an API access token (used by the API client interceptor). */
export function getApiTokenRequest() {
  return {
    scopes: _clientId ? [`api://${_clientId}/access_as_user`] : [],
  };
}

/**
 * Update MSAL configuration at runtime (called when config is fetched from the backend).
 */
export function updateMsalConfig(clientId: string, tenantId: string, authority?: string) {
  _clientId = clientId;
  _tenantId = tenantId;
  _authority = authority || `https://login.microsoftonline.com/${tenantId}`;
  loginRequest = {
    scopes: ['openid', 'profile', 'email'],
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether MSAL config is available (either from env vars or runtime update).
 * Rejects placeholder values like "your-app-registration-client-id".
 */
export function isMsalConfigured(): boolean {
  return UUID_RE.test(_clientId) && UUID_RE.test(_tenantId);
}
