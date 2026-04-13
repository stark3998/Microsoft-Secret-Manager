import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CircularProgress, Box, Typography } from '@mui/material';
import { AppThemeProvider } from './theme/ThemeContext';
import { AuthProvider } from './auth/AuthProvider';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/ToastProvider';
import { DashboardPage } from './pages/DashboardPage';
import { KeyVaultItemsPage } from './pages/KeyVaultItemsPage';
import { AppRegistrationsPage } from './pages/AppRegistrationsPage';
import { EnterpriseAppsPage } from './pages/EnterpriseAppsPage';
import { AppInventoryPage } from './pages/AppInventoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { SamlRotationPage } from './pages/SamlRotationPage';
import { EventGridConfigPage } from './pages/EventGridConfigPage';
import { SetupWizardPage } from './pages/SetupWizardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { ScansPage } from './pages/ScansPage';
import { fetchSetupStatus } from './api/setup';
import { setAuthDisabledMode } from './auth/useAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 50000,
      refetchOnWindowFocus: false,
    },
  },
});


function FullPageLoader() {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" sx={{ backgroundColor: '#FAF9F8' }}>
      <CircularProgress size={24} thickness={4} sx={{ color: '#0078D4' }} />
      <Typography sx={{ mt: 1.5, fontSize: '0.8125rem', color: '#605E5C' }}>
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
          <Route path="/scans" element={<ScansPage />} />
          <Route path="/keyvault-items" element={<KeyVaultItemsPage />} />
          <Route path="/app-registrations" element={<AppRegistrationsPage />} />
          <Route path="/enterprise-apps" element={<EnterpriseAppsPage />} />
          <Route path="/app-inventory" element={<AppInventoryPage />} />
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
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function AppBootstrap() {
  const [appState, setAppState] = useState<'loading' | 'setup' | 'ready' | 'noauth'>('loading');

  const checkStatus = useCallback(async () => {
    setAppState('loading');
    try {
      const status = await fetchSetupStatus();
      if (!status.isConfigured) {
        setAppState('setup');
      } else if (status.authDisabled) {
        setAuthDisabledMode(true);
        setAppState('noauth');
      } else {
        setAuthDisabledMode(false);
        setAppState('ready');
      }
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

  // Auth disabled — render app without MSAL
  if (appState === 'noauth') {
    return <AppRoutes />;
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
      <AppThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AppBootstrap />
          </ToastProvider>
        </QueryClientProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
