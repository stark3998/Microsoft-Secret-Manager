import { useMsal } from '@azure/msal-react';
import { loginRequest, getApiTokenRequest } from './msalConfig';

export interface AuthUser {
  name: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
}

const DEV_USER: AuthUser = {
  name: 'Dev Admin',
  email: 'dev@localhost',
  roles: ['Admin'],
  isAdmin: true,
};

/**
 * When true, auth is bypassed and a dev admin user is returned.
 * Set by AppBootstrap when the backend reports authDisabled.
 */
export let authDisabledMode = false;

export function setAuthDisabledMode(value: boolean) {
  authDisabledMode = value;
}

export function useAuth() {
  // In no-auth mode, return a dev admin user without touching MSAL
  if (authDisabledMode) {
    return {
      user: DEV_USER,
      account: null,
      getAccessToken: async () => '',
      logout: () => { window.location.reload(); },
    };
  }

  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const user: AuthUser | null = account
    ? {
        name: account.name || '',
        email: account.username || '',
        roles: (account.idTokenClaims as Record<string, unknown>)?.roles as string[] || ['Viewer'],
        isAdmin: ((account.idTokenClaims as Record<string, unknown>)?.roles as string[] || []).includes('Admin'),
      }
    : null;

  const getAccessToken = async (): Promise<string> => {
    const apiScopes = getApiTokenRequest();
    try {
      // Try API-scoped access token first
      if (apiScopes.scopes.length > 0) {
        const response = await instance.acquireTokenSilent({ ...apiScopes, account });
        return response.accessToken;
      }
    } catch {
      // API scope not configured — fall through to ID token
    }
    const response = await instance.acquireTokenSilent({ ...loginRequest, account });
    return response.idToken;
  };

  const logout = () => {
    instance.logoutRedirect();
  };

  return { user, account, getAccessToken, logout };
}
