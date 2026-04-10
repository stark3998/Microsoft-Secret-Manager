import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, IconButton, Divider,
  Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BlockIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { ActivityBadge } from './ActivityBadge';
import { useAppSignIns, useAppGraphRaw } from '../../hooks/useAppInventory';
import { formatDate } from '../../utils/formatters';
import type { AppInventoryRecord } from '../../types';

interface AppDetailDialogProps {
  open: boolean;
  item: AppInventoryRecord | null;
  onClose: () => void;
  onDisable: (appId: string) => void;
  onEnable: (appId: string) => void;
  isAdmin: boolean;
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{
        fontSize: '0.625rem', fontWeight: 600, color: '#9CA3AF',
        letterSpacing: '0.05em', textTransform: 'uppercase', mb: 0.5,
      }}>
        {label}
      </Typography>
      <Typography component="div" sx={{ fontSize: '0.8125rem', color: '#111827', wordBreak: 'break-all', lineHeight: 1.5 }}>
        {value || <span style={{ color: '#D1D5DB' }}>--</span>}
      </Typography>
    </Box>
  );
}

function OverviewTab({ item }: { item: AppInventoryRecord }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
      {/* App Info */}
      <Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#605E5C', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Application Info
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <DetailField label="App ID" value={
            <Typography sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#605E5C' }}>{item.appId}</Typography>
          } />
          <DetailField label="Object ID" value={
            <Typography sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#605E5C' }}>{item.appObjectId || '--'}</Typography>
          } />
          <DetailField label="SP ID" value={
            <Typography sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#605E5C' }}>{item.servicePrincipalId || '--'}</Typography>
          } />
          <DetailField label="Type" value={
            item.appType === 'both' ? 'App Registration + Enterprise App' :
              item.appType === 'app_registration' ? 'App Registration' :
                item.appType === 'enterprise_app' ? 'Enterprise App' : item.appType
          } />
          <DetailField label="Account Enabled" value={
            <Chip
              label={item.accountEnabled ? 'Yes' : 'No'}
              size="small"
              sx={{
                backgroundColor: item.accountEnabled ? '#DFF6DD' : '#FDE7E9',
                color: item.accountEnabled ? '#107C10' : '#D13438',
                fontWeight: 600, fontSize: '0.6875rem',
              }}
            />
          } />
          <DetailField label="Classification" value={<ActivityBadge classification={item.activityClassification} size="medium" />} />
        </Box>
      </Box>

      <Divider />

      {/* Credential Summary */}
      <Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#605E5C', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Credentials
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
          <Box sx={{ p: 1.5, backgroundColor: '#FAF9F8', borderRadius: '2px', border: '1px solid #EDEBE9' }}>
            <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C', mb: 0.5 }}>Secrets</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#107C10' }}>{item.activeSecrets}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>active</Typography>
              {item.expiredSecrets > 0 && (
                <>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#D13438' }}>{item.expiredSecrets}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>expired</Typography>
                </>
              )}
            </Box>
          </Box>
          <Box sx={{ p: 1.5, backgroundColor: '#FAF9F8', borderRadius: '2px', border: '1px solid #EDEBE9' }}>
            <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C', mb: 0.5 }}>Certificates</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#107C10' }}>{item.activeCertificates}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>active</Typography>
              {item.expiredCertificates > 0 && (
                <>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#D13438' }}>{item.expiredCertificates}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>expired</Typography>
                </>
              )}
            </Box>
          </Box>
          <Box sx={{ p: 1.5, backgroundColor: '#FAF9F8', borderRadius: '2px', border: '1px solid #EDEBE9' }}>
            <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C', mb: 0.5 }}>Nearest Expiry</Typography>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#323130' }}>
              {item.nearestExpiry ? formatDate(item.nearestExpiry) : 'None'}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Activity Summary */}
      <Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#605E5C', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Activity (Last 30 Days)
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, color: '#0078D4' }}>{item.signInCount30d}</Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C' }}>Total Sign-ins</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, color: '#323130' }}>{item.interactiveSignInCount}</Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C' }}>Interactive</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, color: '#323130' }}>{item.nonInteractiveSignInCount}</Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C' }}>Non-Interactive</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, color: '#323130' }}>{item.servicePrincipalSignInCount}</Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C' }}>Service Principal</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, color: '#323130' }}>{item.managedIdentitySignInCount || 0}</Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C' }}>Managed Identity</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, color: item.failedSignInCount ? '#D13438' : '#323130' }}>
              {item.failedSignInCount || 0}
            </Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C' }}>Failed</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
          <DetailField label="Unique Users" value={item.uniqueUsers30d} />
          <DetailField label="Last Sign-in" value={item.lastSignInAt ? formatDate(item.lastSignInAt) : 'Never'} />
        </Box>
      </Box>

      {/* SP-level activity breakdown (from Reports API) */}
      {(item.spLastSignIn || item.appClientLastSignIn || item.appResourceLastSignIn || item.delegatedClientLastSignIn || item.delegatedResourceLastSignIn) && (
        <>
          <Divider />
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#605E5C', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Service Principal Activity
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <DetailField label="Last Overall Sign-in" value={item.spLastSignIn ? formatDate(item.spLastSignIn) : 'Never'} />
              <DetailField label="App Client (App-only Auth)" value={item.appClientLastSignIn ? formatDate(item.appClientLastSignIn) : 'Never'} />
              <DetailField label="App Resource (App-only Auth)" value={item.appResourceLastSignIn ? formatDate(item.appResourceLastSignIn) : 'Never'} />
              <DetailField label="Delegated Client" value={item.delegatedClientLastSignIn ? formatDate(item.delegatedClientLastSignIn) : 'Never'} />
              <DetailField label="Delegated Resource" value={item.delegatedResourceLastSignIn ? formatDate(item.delegatedResourceLastSignIn) : 'Never'} />
            </Box>
          </Box>
        </>
      )}

      {/* Top Locations, Browsers, Client Apps */}
      {((item.topLocations?.length ?? 0) > 0 || (item.topBrowsers?.length ?? 0) > 0 || (item.topClientApps?.length ?? 0) > 0) && (
        <>
          <Divider />
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#605E5C', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sign-in Insights
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              {(item.topLocations?.length ?? 0) > 0 && (
                <Box sx={{ p: 1.5, backgroundColor: '#FAF9F8', borderRadius: '2px', border: '1px solid #EDEBE9' }}>
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#605E5C', mb: 1 }}>Top Locations</Typography>
                  {item.topLocations.map((loc, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#323130' }}>{loc.location}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#605E5C' }}>{loc.count}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {(item.topBrowsers?.length ?? 0) > 0 && (
                <Box sx={{ p: 1.5, backgroundColor: '#FAF9F8', borderRadius: '2px', border: '1px solid #EDEBE9' }}>
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#605E5C', mb: 1 }}>Top Browsers</Typography>
                  {item.topBrowsers.map((b, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#323130' }}>{b.browser}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#605E5C' }}>{b.count}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {(item.topClientApps?.length ?? 0) > 0 && (
                <Box sx={{ p: 1.5, backgroundColor: '#FAF9F8', borderRadius: '2px', border: '1px solid #EDEBE9' }}>
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#605E5C', mb: 1 }}>Top Client Apps</Typography>
                  {item.topClientApps.map((ca, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#323130' }}>{ca.clientApp}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#605E5C' }}>{ca.count}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </>
      )}

      {/* Credential Activities */}
      {(item.credentialActivities?.length ?? 0) > 0 && (
        <>
          <Divider />
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#605E5C', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Credential Usage
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Key ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Origin</TableCell>
                  <TableCell>Last Sign-in</TableCell>
                  <TableCell>Expiration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {item.credentialActivities.map((cred, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: '#605E5C' }}>
                        {cred.keyId ? cred.keyId.substring(0, 12) + '...' : '--'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={cred.keyType}
                        size="small"
                        sx={{
                          fontSize: '0.625rem',
                          backgroundColor: cred.keyType === 'certificate' ? '#DEECF9' : '#FFF4CE',
                          color: cred.keyType === 'certificate' ? '#0078D4' : '#8A6914',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>{cred.credentialOrigin || '--'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>
                        {cred.lastSignIn ? formatDate(cred.lastSignIn) : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>
                        {cred.expirationDate ? formatDate(cred.expirationDate) : '--'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </Box>
  );
}

function UsersTab({ item }: { item: AppInventoryRecord }) {
  const users = item.topUsers || [];

  if (users.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ color: '#605E5C', fontSize: '0.8125rem' }}>No user activity recorded in the last 30 days.</Typography>
      </Box>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>User</TableCell>
          <TableCell>Email</TableCell>
          <TableCell align="right">Sign-ins</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((u, i) => (
          <TableRow key={i}>
            <TableCell>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{u.displayName || '--'}</Typography>
            </TableCell>
            <TableCell>
              <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>{u.userPrincipalName}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{u.count}</Typography>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SignInsTab({ appId }: { appId: string }) {
  const { data, isLoading } = useAppSignIns(appId);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={20} />
        <Typography sx={{ mt: 1, fontSize: '0.8125rem', color: '#605E5C' }}>Loading sign-in logs...</Typography>
      </Box>
    );
  }

  const signIns = data?.items || [];

  if (signIns.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ color: '#605E5C', fontSize: '0.8125rem' }}>No sign-in records found.</Typography>
      </Box>
    );
  }

  const riskColors: Record<string, string> = {
    none: '#107C10', low: '#F7630C', medium: '#D83B01', high: '#D13438', hidden: '#605E5C',
  };

  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Client / Browser</TableCell>
            <TableCell>Risk</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {signIns.map((s) => {
            const isError = s.status?.errorCode !== 0;
            const types = s.signInEventTypes || [];
            const typeLabel = types.includes('nonInteractiveUser') ? 'Non-Interactive' :
              types.includes('servicePrincipal') ? 'Service Principal' :
                types.includes('managedIdentity') ? 'Managed Identity' : 'Interactive';

            const location = s.location;
            const locStr = location
              ? [location.city, location.state, location.countryOrRegion].filter(Boolean).join(', ')
              : '';

            const device = s.deviceDetail;
            const browserStr = device?.browser || '';
            const osStr = device?.operatingSystem || '';
            const clientStr = s.clientAppUsed || '';

            const riskLevel = s.riskLevelDuringSignIn || 'none';
            const caStatus = s.conditionalAccessStatus;

            const isExpanded = expanded === s.id;

            return (
              <>
                <TableRow
                  key={s.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setExpanded(isExpanded ? null : s.id)}
                >
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem' }}>{s.userDisplayName || s.userPrincipalName || '--'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>{formatDate(s.createdDateTime)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={typeLabel} size="small" sx={{ fontSize: '0.625rem' }} />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>{locStr || '--'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>{clientStr || browserStr || '--'}</Typography>
                  </TableCell>
                  <TableCell>
                    {riskLevel && riskLevel !== 'none' && riskLevel !== 'hidden' ? (
                      <Chip
                        label={riskLevel}
                        size="small"
                        sx={{
                          fontSize: '0.625rem', fontWeight: 600,
                          backgroundColor: riskLevel === 'high' ? '#FDE7E9' : riskLevel === 'medium' ? '#FFF4CE' : '#FFF4CE',
                          color: riskColors[riskLevel] || '#605E5C',
                        }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '0.75rem', color: '#A19F9D' }}>--</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isError ? 'Failed' : 'Success'}
                      size="small"
                      sx={{
                        backgroundColor: isError ? '#FDE7E9' : '#DFF6DD',
                        color: isError ? '#D13438' : '#107C10',
                        fontWeight: 600, fontSize: '0.625rem',
                      }}
                    />
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${s.id}-detail`}>
                    <TableCell colSpan={7} sx={{ backgroundColor: '#FAF9F8', py: 1.5 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2, px: 1 }}>
                        <DetailField label="IP Address" value={s.ipAddress || '--'} />
                        <DetailField label="Browser" value={browserStr || '--'} />
                        <DetailField label="Operating System" value={osStr || '--'} />
                        <DetailField label="Resource" value={s.resourceDisplayName || '--'} />
                        <DetailField label="Conditional Access" value={
                          caStatus ? (
                            <Chip
                              label={caStatus}
                              size="small"
                              sx={{
                                fontSize: '0.625rem', fontWeight: 600,
                                backgroundColor: caStatus === 'success' ? '#DFF6DD' : caStatus === 'failure' ? '#FDE7E9' : '#F3F2F1',
                                color: caStatus === 'success' ? '#107C10' : caStatus === 'failure' ? '#D13438' : '#605E5C',
                              }}
                            />
                          ) : '--'
                        } />
                        <DetailField label="Risk Detail" value={s.riskDetail || '--'} />
                        <DetailField label="User Agent" value={
                          s.userAgent ? (
                            <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C', wordBreak: 'break-all' }}>
                              {s.userAgent.length > 80 ? s.userAgent.substring(0, 80) + '...' : s.userAgent}
                            </Typography>
                          ) : '--'
                        } />
                        {isError && s.status?.failureReason && (
                          <DetailField label="Failure Reason" value={
                            <Typography sx={{ fontSize: '0.6875rem', color: '#D13438' }}>{s.status.failureReason}</Typography>
                          } />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

function GraphRawTab({ appId }: { appId: string }) {
  const { data, isLoading, error } = useAppGraphRaw(appId);
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={20} />
        <Typography sx={{ mt: 1, fontSize: '0.8125rem', color: '#605E5C' }}>Fetching from Graph API...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ color: '#D13438', fontSize: '0.8125rem' }}>Failed to fetch Graph API data.</Typography>
      </Box>
    );
  }

  const jsonStr = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = data ? Object.keys(data) : [];

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>
          Live responses from Microsoft Graph Beta API
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentCopyIcon sx={{ fontSize: '0.875rem' }} />}
          onClick={handleCopy}
          sx={{ fontSize: '0.6875rem' }}
        >
          {copied ? 'Copied' : 'Copy JSON'}
        </Button>
      </Box>

      {sections.map((section) => {
        const sectionData = (data as Record<string, unknown>)[section];
        const errorObj = sectionData && typeof sectionData === 'object' && 'error' in (sectionData as Record<string, unknown>)
          ? sectionData as Record<string, string>
          : null;
        const isPermissionDenied = errorObj?.error?.includes('403') || errorObj?.error?.includes('Permission denied');
        const isEmpty = sectionData === null;
        const isArray = Array.isArray(sectionData);
        const itemCount = isArray ? (sectionData as unknown[]).length : null;

        // Friendly section labels
        const sectionLabels: Record<string, string> = {
          application: 'App Registration',
          servicePrincipal: 'Service Principal',
          recentSignIns: 'Recent Sign-ins (30d)',
          directoryAuditLogs: 'Directory Audit Logs (30d)',
          servicePrincipalSignInActivity: 'SP Sign-in Activity (Reports API)',
          appCredentialSignInActivities: 'Credential Sign-in Activity (Reports API)',
        };

        return (
          <Box key={section} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#0078D4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {sectionLabels[section] || section}
              </Typography>
              {isPermissionDenied && (
                <Chip label="No Permission" size="small" sx={{ fontSize: '0.5625rem', height: 18, backgroundColor: '#FFF4CE', color: '#8A6914', fontWeight: 600 }} />
              )}
              {errorObj && !isPermissionDenied && (
                <Chip label="Error" size="small" sx={{ fontSize: '0.5625rem', height: 18, backgroundColor: '#FDE7E9', color: '#D13438', fontWeight: 600 }} />
              )}
              {isEmpty && (
                <Chip label="Not Found" size="small" sx={{ fontSize: '0.5625rem', height: 18, backgroundColor: '#F3F2F1', color: '#605E5C', fontWeight: 600 }} />
              )}
              {itemCount !== null && (
                <Chip label={`${itemCount} records`} size="small" sx={{ fontSize: '0.5625rem', height: 18, backgroundColor: '#DEECF9', color: '#0078D4', fontWeight: 600 }} />
              )}
            </Box>
            {isPermissionDenied && errorObj?.detail && (
              <Typography sx={{ fontSize: '0.6875rem', color: '#8A6914', backgroundColor: '#FFF4CE', px: 1.5, py: 0.75, borderRadius: '2px', mb: 0.5 }}>
                {errorObj.detail}
              </Typography>
            )}
            {errorObj?.rawResponse && (
              <Box sx={{ mb: 0.5 }}>
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: '#A19F9D', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.5 }}>
                  Raw API Response
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    p: 1.5,
                    backgroundColor: '#2D2019',
                    color: '#F4A261',
                    borderRadius: '2px',
                    fontSize: '0.6875rem',
                    fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
                    lineHeight: 1.6,
                    overflow: 'auto',
                    maxHeight: 250,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    border: '1px solid #5C3D2E',
                    m: 0,
                  }}
                >
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(errorObj.rawResponse), null, 2);
                    } catch {
                      return errorObj.rawResponse;
                    }
                  })()}
                </Box>
              </Box>
            )}
            <Box
              component="pre"
              sx={{
                p: 1.5,
                backgroundColor: '#1E1E1E',
                color: '#D4D4D4',
                borderRadius: '2px',
                fontSize: '0.6875rem',
                fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
                lineHeight: 1.6,
                overflow: 'auto',
                maxHeight: 400,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: '1px solid #3B3A39',
                m: 0,
              }}
            >
              {isEmpty ? 'null' : JSON.stringify(sectionData, null, 2)}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export function AppDetailDialog({ open, item, onClose, onDisable, onEnable, isAdmin }: AppDetailDialogProps) {
  const [tab, setTab] = useState(0);

  if (!item) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
        <Box>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }}>{item.appDisplayName || 'Unknown App'}</Typography>
          <Typography sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#605E5C' }}>{item.appId}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }}>
        <Tab label="Overview" />
        <Tab label={`Users (${item.uniqueUsers30d})`} />
        <Tab label="Sign-in Logs" />
        <Tab label="API Response" />
      </Tabs>

      <DialogContent sx={{ minHeight: 400 }}>
        {tab === 0 && <OverviewTab item={item} />}
        {tab === 1 && <UsersTab item={item} />}
        {tab === 2 && <SignInsTab appId={item.appId} />}
        {tab === 3 && <GraphRawTab appId={item.appId} />}
      </DialogContent>

      {isAdmin && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {item.accountEnabled ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<BlockIcon />}
              onClick={() => onDisable(item.appId)}
              size="small"
            >
              Disable Application
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => onEnable(item.appId)}
              size="small"
            >
              Enable Application
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}
