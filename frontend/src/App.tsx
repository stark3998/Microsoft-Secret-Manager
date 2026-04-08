import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline, CircularProgress, Box, Typography } from '@mui/material';
import { AuthProvider } from './auth/AuthProvider';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardPage } from './pages/DashboardPage';
import { KeyVaultItemsPage } from './pages/KeyVaultItemsPage';
import { AppRegistrationsPage } from './pages/AppRegistrationsPage';
import { EnterpriseAppsPage } from './pages/EnterpriseAppsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { SamlRotationPage } from './pages/SamlRotationPage';
import { EventGridConfigPage } from './pages/EventGridConfigPage';
import { SetupWizardPage } from './pages/SetupWizardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { fetchSetupStatus } from './api/setup';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#4fc3f7' },
    background: { default: '#f5f5f5' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 8 },
});

function FullPageLoader() {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress size={48} />
      <Typography variant="body1" sx={{ mt: 2 }} color="text.secondary">
        Checking configuration...
      </Typography>
    </Box>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/keyvault-items" element={<KeyVaultItemsPage />} />
          <Route path="/app-registrations" element={<AppRegistrationsPage />} />
          <Route path="/enterprise-apps" element={<EnterpriseAppsPage />} />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute requiredRole="Admin">
                <CertificatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saml-rotation"
            element={
              <ProtectedRoute requiredRole="Admin">
                <SamlRotationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eventgrid-config"
            element={
              <ProtectedRoute requiredRole="Admin">
                <EventGridConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRole="Admin">
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function AppBootstrap() {
  const [appState, setAppState] = useState<'loading' | 'setup' | 'ready'>('loading');

  const checkStatus = useCallback(async () => {
    setAppState('loading');
    try {
      const status = await fetchSetupStatus();
      setAppState(status.isConfigured ? 'ready' : 'setup');
    } catch {
      // If the status endpoint fails, assume setup is needed
      setAppState('setup');
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleSetupComplete = useCallback(() => {
    // Full page reload so MSAL + backend pick up the new config
    window.location.reload();
  }, []);

  if (appState === 'loading') return <FullPageLoader />;

  if (appState === 'setup') {
    return <SetupWizardPage onComplete={handleSetupComplete} />;
  }

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <AppBootstrap />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
