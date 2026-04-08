import axios from 'axios';
import { msalInstance } from '../auth/AuthProvider';
import { loginRequest } from '../auth/msalConfig';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach MSAL access token to every request
apiClient.interceptors.request.use(async (config) => {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      config.headers.Authorization = `Bearer ${response.accessToken}`;
    } catch {
      // If silent token acquisition fails, trigger redirect
      await msalInstance.acquireTokenRedirect(loginRequest);
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      msalInstance.acquireTokenRedirect(loginRequest);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
