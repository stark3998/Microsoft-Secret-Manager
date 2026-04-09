import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, IconButton, Tooltip,
  Table, TableBody, TableRow, TableCell, TableHead, Alert, Snackbar,
  Button, TextField, CircularProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import TokenIcon from '@mui/icons-material/KeyOutlined';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import TuneIcon from '@mui/icons-material/TuneOutlined';
import SendIcon from '@mui/icons-material/SendOutlined';
import { useMsal } from '@azure/msal-react';
import { useAuth, authDisabledMode } from '../auth/useAuth';
import { getApiTokenRequest } from '../auth/msalConfig';

// ---------------------------------------------------------------------------
// JWT helpers (decode only — no verification needed for display)
// ---------------------------------------------------------------------------

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

function decodeJwt(token: string): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return {
      header: JSON.parse(base64UrlDecode(parts[0])),
      payload: JSON.parse(base64UrlDecode(parts[1])),
    };
  } catch {
    return null;
  }
}

const TIMESTAMP_CLAIMS = new Set(['iat', 'exp', 'nbf', 'auth_time']);

function formatClaimValue(key: string, value: unknown): string {
  if (TIMESTAMP_CLAIMS.has(key) && typeof value === 'number') {
    const date = new Date(value * 1000);
    return `${value} (${date.toLocaleString()})`;
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function isExpired(claims: Record<string, unknown>): boolean | null {
  const exp = claims.exp;
  if (typeof exp !== 'number') return null;
  return Date.now() / 1000 > exp;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const cardSx = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  transition: 'box-shadow 0.15s ease',
  '&:hover': { boxShadow: '0 2px 8px 0 rgb(0 0 0 / 0.08)' },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <Box display="flex" gap={1.5} alignItems="flex-start" mb={2.5}>
      <Box sx={{
        width: 36, height: 36, borderRadius: '10px',
        backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, mt: 0.25,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mt: 0.25, lineHeight: 1.4 }}>
            {description}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function RawTokenBlock({ token, label }: { token: string; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Raw {label}
        </Typography>
        <Box display="flex" gap={0.5}>
          <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
            <IconButton size="small" onClick={handleCopy} sx={{ color: '#9CA3AF', '&:hover': { color: '#374151' } }}>
              <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
            <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ color: '#9CA3AF', '&:hover': { color: '#374151' } }}>
              {expanded ? <ExpandLessIcon sx={{ fontSize: '0.875rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '0.875rem' }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Box sx={{
        fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
        fontSize: '0.6875rem',
        color: '#374151',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '6px',
        p: 1.5,
        wordBreak: 'break-all',
        maxHeight: expanded ? 'none' : 60,
        overflow: 'hidden',
        position: 'relative',
        lineHeight: 1.6,
      }}>
        {token}
        {!expanded && (
          <Box sx={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
            background: 'linear-gradient(transparent, #F9FAFB)',
          }} />
        )}
      </Box>
    </Box>
  );
}

function ClaimsTable({ claims, title }: { claims: Record<string, unknown>; title: string }) {
  const expired = isExpired(claims);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {title}
        </Typography>
        {expired !== null && (
          <Chip
            label={expired ? 'Expired' : 'Valid'}
            size="small"
            sx={{
              height: 20, fontSize: '0.625rem', fontWeight: 600,
              backgroundColor: expired ? '#FEE2E2' : '#D1FAE5',
              color: expired ? '#DC2626' : '#059669',
            }}
          />
        )}
      </Box>
      <Box sx={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 180, backgroundColor: '#F9FAFB', py: 0.75 }}>Claim</TableCell>
              <TableCell sx={{ backgroundColor: '#F9FAFB', py: 0.75 }}>Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(claims).map(([key, value], idx) => (
              <TableRow key={key} sx={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                <TableCell sx={{
                  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                  fontSize: '0.75rem', fontWeight: 600, color: '#111827', py: 0.75,
                  verticalAlign: 'top',
                }}>
                  {key}
                </TableCell>
                <TableCell sx={{
                  fontFamily: typeof value === 'object' ? '"JetBrains Mono", "Fira Code", "Consolas", monospace' : 'inherit',
                  fontSize: '0.75rem', color: '#374151', py: 0.75,
                  wordBreak: 'break-all', whiteSpace: 'pre-wrap',
                }}>
                  {formatClaimValue(key, value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}

function TokenCard({ title, description, icon, token, label }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  token: string | null;
  label: string;
}) {
  if (!token) {
    return (
      <Card sx={cardSx}>
        <CardContent sx={{ p: 2.5 }}>
          <SectionHeader icon={icon} title={title} description={description} />
          <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
            No {label.toLowerCase()} available. This may happen if the API scope is not configured in your Entra ID app registration.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const decoded = decodeJwt(token);

  return (
    <Card sx={cardSx}>
      <CardContent sx={{ p: 2.5 }}>
        <SectionHeader icon={icon} title={title} description={description} />
        <RawTokenBlock token={token} label={label} />
        {decoded ? (
          <Box display="flex" flexDirection="column" gap={2.5}>
            <ClaimsTable claims={decoded.header} title="Header" />
            <ClaimsTable claims={decoded.payload} title="Claims" />
          </Box>
        ) : (
          <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
            Unable to decode this token. It may not be a valid JWT.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ProfilePage
// ---------------------------------------------------------------------------

const DEFAULT_ID_SCOPES = 'openid profile email';

function getDefaultAccessScopes(): string {
  const apiScopes = getApiTokenRequest();
  return apiScopes.scopes.join(' ') || '';
}

export function ProfilePage() {
  const { user } = useAuth();
  // Hooks must be called unconditionally — guard usage in callbacks instead
  const msalContext = useMsal();
  const account = authDisabledMode ? null : (msalContext?.accounts?.[0] ?? null);
  const instance = authDisabledMode ? null : (msalContext?.instance ?? null);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [acquiring, setAcquiring] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Editable scopes
  const [idScopes, setIdScopes] = useState(DEFAULT_ID_SCOPES);
  const [accessScopes, setAccessScopes] = useState(getDefaultAccessScopes);

  const claims = (account?.idTokenClaims ?? {}) as Record<string, unknown>;

  // Acquire tokens using current scopes (silent, from cache)
  const acquireTokens = useCallback(async (forceRefresh = false) => {
    if (!instance || !account) return;
    setTokenError('');

    // ID token
    try {
      const scopes = idScopes.split(/[\s,]+/).filter(Boolean);
      const response = await instance.acquireTokenSilent({ scopes, account, forceRefresh });
      setIdToken(response.idToken || null);
    } catch (e) {
      setIdToken(null);
      if (forceRefresh) setTokenError(`ID token: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Access token
    try {
      const scopes = accessScopes.split(/[\s,]+/).filter(Boolean);
      if (scopes.length > 0) {
        const response = await instance.acquireTokenSilent({ scopes, account, forceRefresh });
        setAccessToken(response.accessToken || null);
      } else {
        setAccessToken(null);
      }
    } catch (e) {
      setAccessToken(null);
      // Don't overwrite ID token error; append
      if (forceRefresh) {
        setTokenError((prev) => {
          const msg = `Access token: ${e instanceof Error ? e.message : String(e)}`;
          return prev ? `${prev}\n${msg}` : msg;
        });
      }
    }
  }, [instance, account, idScopes, accessScopes]);

  // Initial load — silent from cache
  useEffect(() => {
    acquireTokens(false);
  }, [acquireTokens]);

  // Force refresh — bypasses MSAL cache, gets fresh tokens from Entra ID
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await acquireTokens(true);
      setSnackbar('Tokens refreshed from Entra ID');
    } finally {
      setRefreshing(false);
    }
  };

  // Acquire with custom scopes
  const handleAcquireCustom = async () => {
    setAcquiring(true);
    setTokenError('');
    try {
      await acquireTokens(true);
      setSnackbar('Tokens acquired with custom scopes');
    } finally {
      setAcquiring(false);
    }
  };

  return (
    <Box>
      {/* Page header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4">My Profile</Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280', mt: 0.5 }}>
            Your account details and authentication tokens
          </Typography>
        </Box>
        {!authDisabledMode && (
          <Button
            variant="contained"
            startIcon={refreshing ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon sx={{ fontSize: '1rem' }} />}
            disabled={refreshing}
            onClick={handleRefresh}
            sx={{
              backgroundColor: '#0078D4', color: '#fff', fontSize: '0.75rem', fontWeight: 500,
              px: 2, py: 0.875, borderRadius: '6px', whiteSpace: 'nowrap',
              '&:hover': { backgroundColor: '#106EBE' },
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Tokens'}
          </Button>
        )}
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Token error banner */}
      {tokenError && (
        <Alert severity="error" onClose={() => setTokenError('')} sx={{ mb: 2, fontSize: '0.75rem', whiteSpace: 'pre-line' }}>
          {tokenError}
        </Alert>
      )}

      {/* User Info card */}
      <Card sx={{ ...cardSx, mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <SectionHeader
            icon={<PersonIcon sx={{ fontSize: '1.125rem', color: '#6B7280' }} />}
            title="User Information"
            description="Your identity as determined by the Entra ID token"
          />

          <Box display="flex" alignItems="center" gap={2.5}>
            {/* Avatar */}
            <Box sx={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0078D4 0%, #106EBE 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', fontWeight: 600, color: '#FFFFFF', flexShrink: 0,
            }}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </Box>

            {/* Details */}
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                {user?.name || 'Unknown User'}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280', mt: 0.25 }}>
                {user?.email || 'No email'}
              </Typography>
              <Box display="flex" gap={0.75} mt={1} flexWrap="wrap">
                {(user?.roles || ['Viewer']).map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    size="small"
                    sx={{
                      height: 22, fontSize: '0.6875rem', fontWeight: 600,
                      backgroundColor: role === 'Admin' ? '#D1FAE5' : '#DBEAFE',
                      color: role === 'Admin' ? '#059669' : '#2563EB',
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>

          {/* Account details grid */}
          {account && (
            <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #F3F4F6' }}>
              <Grid container spacing={2}>
                {([
                  { label: 'Object ID (oid)', value: claims.oid },
                  { label: 'Tenant ID (tid)', value: claims.tid },
                  { label: 'Home Account ID', value: account.homeAccountId },
                  { label: 'Environment', value: account.environment },
                ] as { label: string; value: unknown }[]).filter((item) => !!item.value).map(({ label, value }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      {label}
                    </Typography>
                    <Typography sx={{
                      fontSize: '0.75rem', color: '#374151', mt: 0.25,
                      fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                      wordBreak: 'break-all',
                    }}>
                      {String(value)}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Dev mode notice */}
          {authDisabledMode && (
            <Alert severity="info" sx={{ mt: 2, fontSize: '0.75rem' }}>
              Authentication is disabled. Showing dev user profile. No tokens are available.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Token Scopes card */}
      {!authDisabledMode && (
        <Card sx={{ ...cardSx, mb: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <SectionHeader
              icon={<TuneIcon sx={{ fontSize: '1.125rem', color: '#6B7280' }} />}
              title="Token Scopes"
              description="Edit scopes and acquire fresh tokens without signing out — useful for testing different configurations"
            />
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} md={5}>
                <TextField
                  label="ID Token Scopes"
                  value={idScopes}
                  onChange={(e) => setIdScopes(e.target.value)}
                  fullWidth
                  size="small"
                  helperText="Space-separated. Used for acquireTokenSilent to get the ID token."
                  sx={{ '& .MuiInputBase-root': { fontFamily: '"JetBrains Mono", "Consolas", monospace', fontSize: '0.75rem' } }}
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField
                  label="Access Token Scopes"
                  value={accessScopes}
                  onChange={(e) => setAccessScopes(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g. api://{clientId}/access_as_user"
                  helperText="Space-separated. Leave empty to skip access token acquisition."
                  sx={{ '& .MuiInputBase-root': { fontFamily: '"JetBrains Mono", "Consolas", monospace', fontSize: '0.75rem' } }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={acquiring ? <CircularProgress size={14} /> : <SendIcon sx={{ fontSize: '0.875rem' }} />}
                  disabled={acquiring}
                  onClick={handleAcquireCustom}
                  sx={{ fontSize: '0.75rem', fontWeight: 500, py: 0.875, borderRadius: '6px' }}
                >
                  {acquiring ? 'Acquiring...' : 'Acquire'}
                </Button>
              </Grid>
            </Grid>
            <Box display="flex" gap={1} mt={1.5}>
              <Button
                size="small"
                onClick={() => { setIdScopes(DEFAULT_ID_SCOPES); setAccessScopes(getDefaultAccessScopes()); }}
                sx={{ fontSize: '0.6875rem', color: '#6B7280', textTransform: 'none' }}
              >
                Reset to defaults
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Token cards */}
      {!authDisabledMode && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <TokenCard
              title="ID Token"
              description="Identity claims from Entra ID — used to identify the user"
              icon={<BadgeIcon sx={{ fontSize: '1.125rem', color: '#6B7280' }} />}
              token={idToken}
              label="ID Token"
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <TokenCard
              title="Access Token"
              description="API access token — used for backend authorization"
              icon={<TokenIcon sx={{ fontSize: '1.125rem', color: '#6B7280' }} />}
              token={accessToken}
              label="Access Token"
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
