import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Chip, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  Tooltip, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import BlockIcon from '@mui/icons-material/Block';
import RefreshIcon from '@mui/icons-material/Refresh';
import DnsIcon from '@mui/icons-material/Dns';
import {
  useDnsProviders,
  useDnsZones,
  useIssueCertificate,
  useRenewCertificate,
  useRevokeCertificate,
  useCheckRenewals,
} from '../hooks/useCertificates';

export function CertificatesPage() {
  const { data: providersData } = useDnsProviders();
  const { data: zonesData } = useDnsZones();
  const issueMutation = useIssueCertificate();
  const renewMutation = useRenewCertificate();
  const revokeMutation = useRevokeCertificate();
  const checkRenewalsMutation = useCheckRenewals();

  const [issueOpen, setIssueOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Issue form state
  const [issueDomains, setIssueDomains] = useState('');
  const [issueName, setIssueName] = useState('');
  const [issueKeyType, setIssueKeyType] = useState('ec256');
  const [issueDnsProvider, setIssueDnsProvider] = useState('');

  // Renew form state
  const [renewName, setRenewName] = useState('');
  const [renewForce, setRenewForce] = useState(false);

  // Revoke form state
  const [revokeName, setRevokeName] = useState('');
  const [revokeReason, setRevokeReason] = useState(0);

  const providers = providersData?.providers || [];
  const zones = zonesData?.zones || [];

  const handleIssue = async () => {
    const domains = issueDomains.split(',').map((d: string) => d.trim()).filter(Boolean);
    if (!domains.length || !issueName) return;
    try {
      await issueMutation.mutateAsync({
        domains,
        certificate_name: issueName,
        key_type: issueKeyType,
        dns_provider: issueDnsProvider || undefined,
      });
      setSnackbar({ open: true, message: 'Certificate issued successfully', severity: 'success' });
      setIssueOpen(false);
      setIssueDomains('');
      setIssueName('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Issuance failed';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleRenew = async () => {
    if (!renewName) return;
    try {
      const result = await renewMutation.mutateAsync({
        certificate_name: renewName,
        key_type: 'ec256',
        force: renewForce,
      });
      const msg = result.status === 'not_due' ? 'Renewal not yet required' : 'Certificate renewed';
      setSnackbar({ open: true, message: msg, severity: 'success' });
      setRenewOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Renewal failed';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleRevoke = async () => {
    if (!revokeName) return;
    try {
      await revokeMutation.mutateAsync({ certificate_name: revokeName, reason: revokeReason });
      setSnackbar({ open: true, message: 'Certificate revoked', severity: 'success' });
      setRevokeOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Revocation failed';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleCheckRenewals = async () => {
    try {
      const result = await checkRenewalsMutation.mutateAsync();
      setSnackbar({
        open: true,
        message: `Renewal check: ${result.renewed} renewed, ${result.errors} errors`,
        severity: result.errors > 0 ? 'error' : 'success',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Check failed';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Certificate Management
        </Typography>
        <Box display="flex" gap={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIssueOpen(true)}>
            Issue Certificate
          </Button>
          <Button variant="outlined" startIcon={<AutorenewIcon />} onClick={() => setRenewOpen(true)}>
            Renew
          </Button>
          <Button variant="outlined" color="error" startIcon={<BlockIcon />} onClick={() => setRevokeOpen(true)}>
            Revoke
          </Button>
          <Tooltip title="Check all managed certificates for renewal">
            <Button
              variant="outlined"
              startIcon={checkRenewalsMutation.isPending ? <CircularProgress size={18} /> : <RefreshIcon />}
              onClick={handleCheckRenewals}
              disabled={checkRenewalsMutation.isPending}
            >
              Check Renewals
            </Button>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* DNS Providers */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <DnsIcon color="primary" />
                <Typography variant="h6">DNS Providers</Typography>
              </Box>
              {providers.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No DNS providers configured. Configure in Settings.
                </Typography>
              ) : (
                providers.map((p: { key: string; name: string }) => (
                  <Chip key={p.key} label={p.name} sx={{ mr: 1, mb: 1 }} variant="outlined" />
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* DNS Zones */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>DNS Zones</Typography>
              {zones.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No DNS zones found.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
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
                          <TableCell>{z.zone || <em style={{ color: '#999' }}>{z.error}</em>}</TableCell>
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
        <DialogTitle>Issue New Certificate</DialogTitle>
        <DialogContent>
          <TextField
            label="Certificate Name"
            value={issueName}
            onChange={(e) => setIssueName(e.target.value)}
            fullWidth
            margin="normal"
            helperText="Name for Key Vault storage"
          />
          <TextField
            label="Domains"
            value={issueDomains}
            onChange={(e) => setIssueDomains(e.target.value)}
            fullWidth
            margin="normal"
            helperText="Comma-separated (first = CN, rest = SANs)"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Key Type</InputLabel>
            <Select value={issueKeyType} onChange={(e) => setIssueKeyType(e.target.value)} label="Key Type">
              <MenuItem value="ec256">EC P-256</MenuItem>
              <MenuItem value="ec384">EC P-384</MenuItem>
              <MenuItem value="rsa2048">RSA 2048</MenuItem>
              <MenuItem value="rsa4096">RSA 4096</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>DNS Provider</InputLabel>
            <Select
              value={issueDnsProvider}
              onChange={(e) => setIssueDnsProvider(e.target.value)}
              label="DNS Provider"
            >
              <MenuItem value="">Auto-detect</MenuItem>
              {providers.map((p: { key: string; name: string }) => (
                <MenuItem key={p.key} value={p.key}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleIssue}
            disabled={issueMutation.isPending || !issueName || !issueDomains}
          >
            {issueMutation.isPending ? <CircularProgress size={20} /> : 'Issue'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={renewOpen} onClose={() => setRenewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Renew Certificate</DialogTitle>
        <DialogContent>
          <TextField
            label="Certificate Name"
            value={renewName}
            onChange={(e) => setRenewName(e.target.value)}
            fullWidth
            margin="normal"
            helperText="Key Vault certificate name"
          />
          <Box mt={1}>
            <label>
              <input
                type="checkbox"
                checked={renewForce}
                onChange={(e) => setRenewForce(e.target.checked)}
              />
              {' '}Force renewal (even if not due)
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRenew}
            disabled={renewMutation.isPending || !renewName}
          >
            {renewMutation.isPending ? <CircularProgress size={20} /> : 'Renew'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={revokeOpen} onClose={() => setRevokeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revoke Certificate</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Certificate revocation is permanent and cannot be undone.
          </Alert>
          <TextField
            label="Certificate Name"
            value={revokeName}
            onChange={(e) => setRevokeName(e.target.value)}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
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
        <DialogActions>
          <Button onClick={() => setRevokeOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRevoke}
            disabled={revokeMutation.isPending || !revokeName}
          >
            {revokeMutation.isPending ? <CircularProgress size={20} /> : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
