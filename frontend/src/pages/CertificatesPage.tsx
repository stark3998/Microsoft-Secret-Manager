import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Chip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip,
  CircularProgress, Divider, FormControlLabel, Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddOutlined';
import AutorenewIcon from '@mui/icons-material/AutorenewOutlined';
import BlockIcon from '@mui/icons-material/BlockOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import { PageHeader } from '../components/common/PageHeader';
import {
  useDnsProviders,
  useDnsZones,
  useIssueCertificate,
  useRenewCertificate,
  useRevokeCertificate,
  useCheckRenewals,
} from '../hooks/useCertificates';
import { useToast } from '../components/common/ToastProvider';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase', mb: 1.5 }}>
      {children}
    </Typography>
  );
}

export function CertificatesPage() {
  const { data: providersData } = useDnsProviders();
  const { data: zonesData } = useDnsZones();
  const issueMutation = useIssueCertificate();
  const renewMutation = useRenewCertificate();
  const revokeMutation = useRevokeCertificate();
  const checkRenewalsMutation = useCheckRenewals();
  const toast = useToast();

  const [issueOpen, setIssueOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const [issueDomains, setIssueDomains] = useState('');
  const [issueName, setIssueName] = useState('');
  const [issueKeyType, setIssueKeyType] = useState('ec256');
  const [issueDnsProvider, setIssueDnsProvider] = useState('');
  const [renewName, setRenewName] = useState('');
  const [renewForce, setRenewForce] = useState(false);
  const [revokeName, setRevokeName] = useState('');
  const [revokeReason, setRevokeReason] = useState(0);

  const providers = providersData?.providers || [];
  const zones = zonesData?.zones || [];

  const handleIssue = async () => {
    const domains = issueDomains.split(',').map((d: string) => d.trim()).filter(Boolean);
    if (!domains.length || !issueName) return;
    try {
      await issueMutation.mutateAsync({
        domains, certificate_name: issueName, key_type: issueKeyType,
        dns_provider: issueDnsProvider || undefined,
      });
      toast.success('Certificate issued successfully');
      setIssueOpen(false);
      setIssueDomains('');
      setIssueName('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Issuance failed');
    }
  };

  const handleRenew = async () => {
    if (!renewName) return;
    try {
      const result = await renewMutation.mutateAsync({ certificate_name: renewName, key_type: 'ec256', force: renewForce });
      toast.success(result.status === 'not_due' ? 'Renewal not yet required' : 'Certificate renewed');
      setRenewOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Renewal failed');
    }
  };

  const handleRevoke = async () => {
    if (!revokeName) return;
    try {
      await revokeMutation.mutateAsync({ certificate_name: revokeName, reason: revokeReason });
      toast.success('Certificate revoked');
      setRevokeOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Revocation failed');
    }
  };

  const handleCheckRenewals = async () => {
    try {
      const result = await checkRenewalsMutation.mutateAsync();
      if (result.errors > 0) {
        toast.error(`Renewal check: ${result.renewed} renewed, ${result.errors} errors`);
      } else {
        toast.success(`Renewal check: ${result.renewed} renewed, ${result.errors} errors`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Check failed');
    }
  };

  return (
    <Box>
      <PageHeader
        title="Certificate Management"
        description="Issue, renew, and revoke ACME certificates via Let's Encrypt."
        action={
          <Box display="flex" gap={1}>
            <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setIssueOpen(true)}>
              Issue Certificate
            </Button>
            <Button variant="outlined" startIcon={<AutorenewIcon />} size="small" onClick={() => setRenewOpen(true)}>
              Renew
            </Button>
            <Button variant="outlined" color="error" startIcon={<BlockIcon />} size="small" onClick={() => setRevokeOpen(true)}>
              Revoke
            </Button>
            <Tooltip title="Check all managed certificates for renewal">
              <Button
                variant="outlined"
                size="small"
                startIcon={checkRenewalsMutation.isPending ? <CircularProgress size={14} sx={{ color: '#9CA3AF' }} /> : <RefreshIcon />}
                onClick={handleCheckRenewals}
                disabled={checkRenewalsMutation.isPending}
              >
                Check Renewals
              </Button>
            </Tooltip>
          </Box>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <SectionLabel>DNS Providers</SectionLabel>
              {providers.length === 0 ? (
                <Typography sx={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>
                  No DNS providers configured.
                </Typography>
              ) : (
                <Box display="flex" gap={0.75} flexWrap="wrap">
                  {providers.map((p: { key: string; name: string }) => (
                    <Chip key={p.key} label={p.name} size="small" variant="outlined" />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <SectionLabel>DNS Zones</SectionLabel>
              {zones.length === 0 ? (
                <Typography sx={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>
                  No DNS zones found.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid #F3F4F6' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Zone</TableCell>
                        <TableCell>Provider</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {zones.map((z: { zone: string | null; provider: string; provider_name: string; error?: string }, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{z.zone || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{z.error}</span>}</TableCell>
                          <TableCell>
                            <Chip label={z.provider_name} size="small" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Issue Dialog */}
      <Dialog open={issueOpen} onClose={() => setIssueOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ px: 3, pt: 2.5, pb: 0 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>Issue New Certificate</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mt: 0.25 }}>Request a new ACME certificate.</Typography>
        </DialogTitle>
        <Divider sx={{ mt: 2 }} />
        <DialogContent sx={{ px: 3, pt: 2.5 }}>
          <TextField label="Certificate Name" value={issueName} onChange={(e) => setIssueName(e.target.value)}
            fullWidth size="small" sx={{ mb: 2 }} helperText="Name for Key Vault storage" />
          <TextField label="Domains" value={issueDomains} onChange={(e) => setIssueDomains(e.target.value)}
            fullWidth size="small" sx={{ mb: 2 }} helperText="Comma-separated (first = CN, rest = SANs)" />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Key Type</InputLabel>
                <Select value={issueKeyType} onChange={(e) => setIssueKeyType(e.target.value)} label="Key Type">
                  <MenuItem value="ec256">EC P-256</MenuItem>
                  <MenuItem value="ec384">EC P-384</MenuItem>
                  <MenuItem value="rsa2048">RSA 2048</MenuItem>
                  <MenuItem value="rsa4096">RSA 4096</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>DNS Provider</InputLabel>
                <Select value={issueDnsProvider} onChange={(e) => setIssueDnsProvider(e.target.value)} label="DNS Provider">
                  <MenuItem value="">Auto-detect</MenuItem>
                  {providers.map((p: { key: string; name: string }) => (
                    <MenuItem key={p.key} value={p.key}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button size="small" onClick={() => setIssueOpen(false)}>Cancel</Button>
          <Button variant="contained" size="small" onClick={handleIssue}
            disabled={issueMutation.isPending || !issueName || !issueDomains}>
            {issueMutation.isPending ? 'Issuing...' : 'Issue Certificate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={renewOpen} onClose={() => setRenewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ px: 3, pt: 2.5, pb: 0 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>Renew Certificate</Typography>
        </DialogTitle>
        <Divider sx={{ mt: 2 }} />
        <DialogContent sx={{ px: 3, pt: 2.5 }}>
          <TextField label="Certificate Name" value={renewName} onChange={(e) => setRenewName(e.target.value)}
            fullWidth size="small" sx={{ mb: 2 }} helperText="Key Vault certificate name" />
          <FormControlLabel
            control={<Checkbox size="small" checked={renewForce} onChange={(e) => setRenewForce(e.target.checked)} />}
            label={<Typography sx={{ fontSize: '0.8125rem' }}>Force renewal (even if not due)</Typography>}
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button size="small" onClick={() => setRenewOpen(false)}>Cancel</Button>
          <Button variant="contained" size="small" onClick={handleRenew}
            disabled={renewMutation.isPending || !renewName}>
            {renewMutation.isPending ? 'Renewing...' : 'Renew'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={revokeOpen} onClose={() => setRevokeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ px: 3, pt: 2.5, pb: 0 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>Revoke Certificate</Typography>
        </DialogTitle>
        <Divider sx={{ mt: 2 }} />
        <DialogContent sx={{ px: 3, pt: 2.5 }}>
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.8125rem' }}>
            Certificate revocation is permanent and cannot be undone.
          </Alert>
          <TextField label="Certificate Name" value={revokeName} onChange={(e) => setRevokeName(e.target.value)}
            fullWidth size="small" sx={{ mb: 2 }} />
          <FormControl fullWidth size="small">
            <InputLabel>Reason</InputLabel>
            <Select value={revokeReason} onChange={(e) => setRevokeReason(Number(e.target.value))} label="Reason">
              <MenuItem value={0}>Unspecified</MenuItem>
              <MenuItem value={1}>Key Compromise</MenuItem>
              <MenuItem value={3}>Affiliation Changed</MenuItem>
              <MenuItem value={4}>Superseded</MenuItem>
              <MenuItem value={5}>Cessation of Operation</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button size="small" onClick={() => setRevokeOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" size="small" onClick={handleRevoke}
            disabled={revokeMutation.isPending || !revokeName}>
            {revokeMutation.isPending ? 'Revoking...' : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
