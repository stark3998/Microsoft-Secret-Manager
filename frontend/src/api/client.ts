import axios from 'axios';
import { msalInstance } from '../auth/AuthProvider';
import { loginRequest, getApiTokenRequest } from '../auth/msalConfig';
import { authDisabledMode } from '../auth/useAuth';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach MSAL access token to every request
apiClient.interceptors.request.use(async (config) => {
  if (authDisabledMode || !msalInstance) return config;

  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (account) {
    // Try API-scoped token first; fall back to basic ID token
    const apiScopes = getApiTokenRequest();
    const tokenRequest = apiScopes.scopes.length > 0 ? { ...apiScopes, account } : { ...loginRequest, account };
    try {
      const response = await msalInstance.acquireTokenSilent(tokenRequest);
      config.headers.Authorization = `Bearer ${response.accessToken}`;
    } catch {
      // If API scope fails (not configured), try basic scopes for ID token
      try {
        const response = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
        config.headers.Authorization = `Bearer ${response.idToken}`;
      } catch {
        await msalInstance.acquireTokenRedirect(loginRequest);
      }
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && msalInstance) {
      msalInstance.acquireTokenRedirect(loginRequest);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
