import { ReactNode, useState, useEffect } from 'react';
import { MsalProvider, MsalAuthenticationTemplate } from '@azure/msal-react';
import { PublicClientApplication, InteractionType } from '@azure/msal-browser';
import { CircularProgress, Box, Typography } from '@mui/material';
import { getMsalConfig, loginRequest, updateMsalConfig, isMsalConfigured } from './msalConfig';
import { fetchFrontendConfig } from '../api/setup';

/**
 * Shared MSAL instance — initialised once AuthProvider mounts.
 * Other modules (e.g. api/client.ts) import this for silent token acquisition.
 */
export let msalInstance: PublicClientApplication | null = null;

function LoadingComponent() {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress size={48} />
      <Typography variant="body1" sx={{ mt: 2 }}>
        Signing in...
      </Typography>
    </Box>
  );
}

function ErrorComponent({ error }: { error: Error | null }) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
      <Typography variant="h5" color="error" gutterBottom>
        Authentication Error
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {error?.message || 'An error occurred during authentication.'}
      </Typography>
    </Box>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // If VITE_ env vars are not set, try fetching config from the backend
        if (!isMsalConfigured()) {
          const config = await fetchFrontendConfig();
          if (config.configured && config.clientId && config.tenantId) {
            updateMsalConfig(config.clientId, config.tenantId, config.authority);
          } else {
            if (!cancelled) setError('Authentication is not configured. Please complete the setup wizard.');
            return;
          }
        }

        const instance = new PublicClientApplication(getMsalConfig());
        await instance.initialize();
        msalInstance = instance;

        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to initialise authentication');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  if (error) return <ErrorComponent error={new Error(error)} />;
  if (!ready) return <LoadingComponent />;

  return (
    <MsalProvider instance={msalInstance!}>
      <MsalAuthenticationTemplate
        interactionType={InteractionType.Redirect}
        authenticationRequest={loginRequest}
        loadingComponent={LoadingComponent}
        errorComponent={ErrorComponent}
      >
        {children}
      </MsalAuthenticationTemplate>
    </MsalProvider>
  );
}
