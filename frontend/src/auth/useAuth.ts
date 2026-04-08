import { useMsal } from '@azure/msal-react';
import { loginRequest } from './msalConfig';

export interface AuthUser {
  name: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
}

export function useAuth() {
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
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: account,
    });
    return response.accessToken;
  };

  const logout = () => {
    instance.logoutRedirect();
  };

  return { user, account, getAccessToken, logout };
}
