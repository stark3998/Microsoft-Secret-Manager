import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
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
import { NotFoundPage } from './pages/NotFoundPage';

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

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
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
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
