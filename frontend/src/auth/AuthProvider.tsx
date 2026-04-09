import { ReactNode, useState, useEffect, useCallback } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { getMsalConfig, loginRequest, updateMsalConfig, isMsalConfigured } from './msalConfig';
import { fetchFrontendConfig } from '../api/setup';

/**
 * Shared MSAL instance — initialised once AuthProvider mounts.
 * Other modules (e.g. api/client.ts) import this for silent token acquisition.
 */
export let msalInstance: PublicClientApplication | null = null;

// ── Module-level singleton to survive React StrictMode double-mount ──
let _initPromise: Promise<PublicClientApplication> | null = null;

async function ensureMsalInit(): Promise<PublicClientApplication> {
  // Return the existing promise if init is already in progress or done
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    // Resolve MSAL config: VITE_ env vars or backend fallback
    if (!isMsalConfigured()) {
      const config = await fetchFrontendConfig();
      if (config.configured && config.clientId && config.tenantId) {
        updateMsalConfig(config.clientId, config.tenantId, config.authority);
      } else {
        throw new Error('Authentication is not configured. Please complete the setup wizard.');
      }
    }

    const instance = new PublicClientApplication(getMsalConfig());
    await instance.initialize();

    // Process the redirect response if we're returning from Entra ID.
    // This must happen exactly once — the auth code in the URL is consumed.
    try {
      const response = await instance.handleRedirectPromise();
      if (response?.account) {
        instance.setActiveAccount(response.account);
      }
    } catch (redirectErr) {
      // Stale cache from previous failed attempts — clear and continue
      console.warn('MSAL redirect handling failed, clearing cache:', redirectErr);
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('msal.') || key.includes('.msal.')) {
          localStorage.removeItem(key);
        }
      }
    }

    // Set active account from cache if not set by redirect
    if (!instance.getActiveAccount()) {
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0) {
        instance.setActiveAccount(accounts[0]);
      }
    }

    // Listen for login events
    instance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const payload = event.payload as { account?: Parameters<typeof instance.setActiveAccount>[0] };
        if (payload.account) {
          instance.setActiveAccount(payload.account);
        }
      }
    });

    msalInstance = instance;
    return instance;
  })();

  return _initPromise;
}

// ── UI components ──

function LoadingScreen() {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress size={48} />
      <Typography variant="body1" sx={{ mt: 2 }}>Signing in...</Typography>
    </Box>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" gap={2}>
      <Typography variant="h5" color="error" gutterBottom>Authentication Error</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, textAlign: 'center' }}>
        {message}
      </Typography>
      {onRetry && <Button variant="contained" onClick={onRetry} sx={{ mt: 2 }}>Try Again</Button>}
    </Box>
  );
}

// ── AuthProvider ──

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'authenticated' | 'error'>('loading');
  const [error, setError] = useState('');

  const init = useCallback(async () => {
    setState('loading');
    setError('');

    try {
      const instance = await ensureMsalInit();

      // Check if user has an authenticated account
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0) {
        setState('authenticated');
      } else {
        // No accounts — redirect to Entra ID login.
        // This navigates the browser away; component won't proceed past this.
        await instance.loginRedirect(loginRequest);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initialise authentication');
      setState('error');
    }
  }, []);

  useEffect(() => { init(); }, [init]);

  if (state === 'loading') return <LoadingScreen />;
  if (state === 'error') return <ErrorScreen message={error} onRetry={() => { _initPromise = null; init(); }} />;

  return (
    <MsalProvider instance={msalInstance!}>
      {children}
    </MsalProvider>
  );
}
