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
      staleTime: 50000,
      refetchOnWindowFocus: false,
    },
  },
});

const theme = createTheme({
  palette: {
    primary: { main: '#0078D4', light: '#DEECF9', dark: '#004578' },
    secondary: { main: '#0078D4', light: '#DEECF9', dark: '#004578' },
    error: { main: '#D13438' },
    warning: { main: '#F7630C' },
    success: { main: '#107C10' },
    info: { main: '#0078D4' },
    background: { default: '#FAF9F8', paper: '#FFFFFF' },
    text: { primary: '#323130', secondary: '#605E5C' },
    divider: '#EDEBE9',
  },
  typography: {
    fontFamily: '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif',
    h4: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: 0, color: '#323130' },
    h5: { fontSize: '1.125rem', fontWeight: 600, letterSpacing: 0, color: '#323130' },
    h6: { fontSize: '1rem', fontWeight: 600, letterSpacing: 0, color: '#323130' },
    subtitle1: { fontSize: '0.875rem', fontWeight: 600, color: '#323130' },
    body1: { fontSize: '0.875rem', color: '#323130', lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', color: '#605E5C', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', fontWeight: 400, color: '#A19F9D' },
  },
  shape: { borderRadius: 2 },
  shadows: [
    'none',
    '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
    '0 3.2px 7.2px 0 rgba(0,0,0,.132), 0 0.6px 1.8px 0 rgba(0,0,0,.108)',
    '0 6.4px 14.4px 0 rgba(0,0,0,.132), 0 1.2px 3.6px 0 rgba(0,0,0,.108)',
    '0 12.8px 28.8px 0 rgba(0,0,0,.132), 0 2.4px 7.2px 0 rgba(0,0,0,.108)',
    ...Array(20).fill('0 12.8px 28.8px 0 rgba(0,0,0,.132), 0 2.4px 7.2px 0 rgba(0,0,0,.108)'),
  ] as unknown as typeof createTheme extends (o: infer T) => unknown ? T extends { shadows?: infer S } ? S : never : never,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#FAF9F8', margin: 0, padding: 0 },
        '::-webkit-scrollbar': { width: 8, height: 8 },
        '::-webkit-scrollbar-thumb': { backgroundColor: '#C8C6C4', borderRadius: 4 },
        '::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #EDEBE9',
          borderRadius: 2,
          boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: '1px solid #EDEBE9', borderRadius: 2 },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          fontSize: '0.8125rem',
          borderRadius: 2,
          padding: '6px 20px',
          lineHeight: 1.5,
          minHeight: 32,
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
          backgroundColor: '#D13438',
          color: '#fff',
          '&:hover': { backgroundColor: '#A4262C' },
        },
        outlined: {
          borderColor: '#8A8886',
          color: '#323130',
          backgroundColor: '#FFFFFF',
          '&:hover': { borderColor: '#323130', backgroundColor: '#F3F2F1' },
        },
        text: {
          color: '#0078D4',
          '&:hover': { backgroundColor: '#F3F2F1' },
        },
        sizeSmall: {
          padding: '4px 12px',
          fontSize: '0.75rem',
          minHeight: 28,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          color: '#605E5C',
          '&:hover': { backgroundColor: '#F3F2F1', color: '#323130' },
        },
        sizeSmall: { padding: 4 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#FAFAFA',
            color: '#605E5C',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderBottom: '2px solid #EDEBE9',
            padding: '8px 12px',
            whiteSpace: 'nowrap' as const,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: '1px solid #F3F2F1', padding: '8px 12px', fontSize: '0.8125rem', color: '#323130' },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#F3F2F1' },
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.6875rem', height: 24, borderRadius: 2 },
        sizeSmall: { height: 20 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 2, border: '1px solid #EDEBE9', boxShadow: '0 25.6px 57.6px 0 rgba(0,0,0,.22), 0 4.8px 14.4px 0 rgba(0,0,0,.18)' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' as const },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            fontSize: '0.8125rem',
            borderRadius: 2,
            '& fieldset': { borderColor: '#8A8886' },
            '&:hover fieldset': { borderColor: '#323130' },
            '&.Mui-focused fieldset': { borderColor: '#0078D4', borderWidth: 2 },
          },
          '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
          '& .MuiFormHelperText-root': { fontSize: '0.75rem', marginTop: 4 },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 400,
          fontSize: '0.875rem',
          minHeight: 44,
          color: '#605E5C',
          padding: '12px 16px',
          '&.Mui-selected': { color: '#323130', fontWeight: 600 },
          '&:hover': { backgroundColor: '#F3F2F1' },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderBottom: '1px solid #EDEBE9',
          '& .MuiTabs-indicator': { height: 2, backgroundColor: '#0078D4' },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 2, fontSize: '0.8125rem' },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 8 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 2, fontSize: '0.75rem', backgroundColor: '#323130' },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#EDEBE9' },
      },
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
