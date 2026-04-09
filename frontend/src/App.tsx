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
import { ProfilePage } from './pages/ProfilePage';
import { ScansPage } from './pages/ScansPage';
import { fetchSetupStatus } from './api/setup';
import { setAuthDisabledMode } from './auth/useAuth';

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
    primary: { main: '#0078D4', light: '#50A0E2', dark: '#005A9E' },
    secondary: { main: '#0078D4', light: '#50A0E2', dark: '#005A9E' },
    error: { main: '#DC2626' },
    warning: { main: '#D97706' },
    success: { main: '#059669' },
    info: { main: '#0284C7' },
    background: { default: '#F0F2F5', paper: '#FFFFFF' },
    text: { primary: '#111827', secondary: '#6B7280' },
    divider: '#E5E7EB',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: { fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#111827' },
    h6: { fontSize: '0.95rem', fontWeight: 600, letterSpacing: '-0.01em', color: '#111827' },
    subtitle1: { fontSize: '0.875rem', fontWeight: 600, color: '#374151' },
    body1: { fontSize: '0.875rem', color: '#374151' },
    body2: { fontSize: '0.8125rem', color: '#4B5563' },
    caption: { fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: '#6B7280' },
  },
  shape: { borderRadius: 4 },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.03)',
    '0 1px 3px 0 rgb(0 0 0 / 0.04)',
    '0 2px 4px -1px rgb(0 0 0 / 0.04)',
    '0 4px 6px -2px rgb(0 0 0 / 0.03)',
    ...Array(20).fill('0 4px 6px -2px rgb(0 0 0 / 0.03)'),
  ] as unknown as typeof createTheme extends (o: infer T) => unknown ? T extends { shadows?: infer S } ? S : never : never,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#F0F2F5', margin: 0, padding: 0 },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          transition: 'box-shadow 0.15s ease',
          '&:hover': { boxShadow: '0 2px 8px 0 rgb(0 0 0 / 0.08)' },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: '1px solid #E5E7EB', borderRadius: 8 },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
          fontSize: '0.8125rem',
          borderRadius: 4,
          padding: '7px 16px',
          lineHeight: 1.5,
        },
        contained: {
          backgroundColor: '#0078D4',
          color: '#fff',
          '&:hover': { backgroundColor: '#106EBE' },
          '&:active': { backgroundColor: '#005A9E' },
        },
        containedSecondary: {
          backgroundColor: '#0078D4',
          color: '#fff',
          '&:hover': { backgroundColor: '#106EBE' },
        },
        containedError: {
          backgroundColor: '#DC2626',
          color: '#fff',
          '&:hover': { backgroundColor: '#B91C1C', transform: 'translateY(-0.5px)' },
        },
        outlined: {
          borderColor: '#D1D5DB',
          color: '#374151',
          backgroundColor: '#FFFFFF',
          '&:hover': { borderColor: '#9CA3AF', backgroundColor: '#F9FAFB' },
        },
        text: {
          color: '#6B7280',
          '&:hover': { backgroundColor: '#F3F4F6', color: '#374151' },
        },
        sizeSmall: {
          padding: '5px 14px',
          fontSize: '0.75rem',
          borderRadius: 6,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          '&:hover': { backgroundColor: '#F3F4F6' },
        },
        sizeSmall: { padding: 6 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#F9FAFB',
            color: '#6B7280',
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            borderBottom: '1px solid #E5E7EB',
            padding: '10px 16px',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: '1px solid #F3F4F6', padding: '10px 16px', fontSize: '0.8125rem' },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#F9FAFB' },
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: '0.6875rem', height: 24, borderRadius: 4 },
        sizeSmall: { height: 22 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 20px 60px -12px rgb(0 0 0 / 0.2)' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' as const },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            fontSize: '0.8125rem',
            borderRadius: 4,
            '& fieldset': { borderColor: '#D1D5DB' },
            '&:hover fieldset': { borderColor: '#9CA3AF' },
            '&.Mui-focused fieldset': { borderColor: '#0078D4', borderWidth: 2 },
          },
          '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
          '& .MuiFormHelperText-root': { fontSize: '0.6875rem', marginTop: 4 },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
          fontSize: '0.8125rem',
          minHeight: 40,
          color: '#6B7280',
          '&.Mui-selected': { color: '#0078D4', fontWeight: 600 },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
          borderBottom: '1px solid #E5E7EB',
          '& .MuiTabs-indicator': { height: 2, borderRadius: '2px 2px 0 0', backgroundColor: '#0078D4' },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 4, fontSize: '0.8125rem' },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 8 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 4, fontSize: '0.6875rem' },
      },
    },
  },
});

function FullPageLoader() {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" sx={{ backgroundColor: '#F0F2F5' }}>
      <CircularProgress size={24} thickness={4} sx={{ color: '#9CA3AF' }} />
      <Typography sx={{ mt: 1.5, fontSize: '0.8125rem', color: '#9CA3AF' }}>
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
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <AppBootstrap />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
