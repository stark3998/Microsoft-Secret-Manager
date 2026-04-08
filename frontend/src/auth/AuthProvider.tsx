import { ReactNode } from 'react';
import { MsalProvider, MsalAuthenticationTemplate } from '@azure/msal-react';
import { PublicClientApplication, InteractionType } from '@azure/msal-browser';
import { msalConfig, loginRequest } from './msalConfig';
import { CircularProgress, Box, Typography } from '@mui/material';

const msalInstance = new PublicClientApplication(msalConfig);

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
  return (
    <MsalProvider instance={msalInstance}>
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

export { msalInstance };
