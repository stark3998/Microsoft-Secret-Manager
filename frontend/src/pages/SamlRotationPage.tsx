import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Alert, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Tabs, Tab,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import HistoryIcon from '@mui/icons-material/History';
import {
  useRotations,
  useEligibleApps,
  useInitiateRotation,
  useActivateRotation,
  useCancelRotation,
  useRunRotationCycle,
} from '../hooks/useSamlRotation';
import { ROTATION_STATE_COLORS, ROTATION_STATE_LABELS } from '../utils/constants';
import type { RotationJob, EligibleApp } from '../types';

function RotationStateChip({ state }: { state: string }) {
  return (
    <Chip
      label={ROTATION_STATE_LABELS[state] || state}
      size="small"
      sx={{
        backgroundColor: ROTATION_STATE_COLORS[state] || '#757575',
        color: '#fff',
        fontWeight: 600,
      }}
    />
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function SamlRotationPage() {
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'activate' | 'cancel' | 'initiate';
    id?: string;
    appName?: string;
    spId?: string;
  }>({ open: false, type: 'activate' });

  const { data: allRotations, isLoading: rotationsLoading } = useRotations();
  const { data: eligibleApps, isLoading: eligibleLoading } = useEligibleApps();
  const initiateMutation = useInitiateRotation();
  const activateMutation = useActivateRotation();
  const cancelMutation = useCancelRotation();
  const cycleMutation = useRunRotationCycle();

  const rotations: RotationJob[] = allRotations || [];
  const eligible: EligibleApp[] = eligibleApps || [];

  const activeRotations = rotations.filter(
    (r) => ['staged', 'notified', 'activated'].includes(r.state)
  );
  const completedRotations = rotations.filter(
    (r) => ['completed', 'cancelled', 'failed'].includes(r.state)
  );

  const stateCounts = rotations.reduce(
    (acc, r) => {
      acc[r.state] = (acc[r.state] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const handleConfirm = async () => {
    const { type, id, spId, appName } = confirmDialog;
    setConfirmDialog({ ...confirmDialog, open: false });

    try {
      if (type === 'activate' && id) {
        await activateMutation.mutateAsync(id);
        setSnackbar({ open: true, message: 'Rotation activated successfully', severity: 'success' });
      } else if (type === 'cancel' && id) {
        await cancelMutation.mutateAsync(id);
        setSnackbar({ open: true, message: 'Rotation cancelled', severity: 'success' });
      } else if (type === 'initiate' && spId) {
        await initiateMutation.mutateAsync({
          service_principal_id: spId,
          app_display_name: appName,
        });
        setSnackbar({ open: true, message: 'Rotation initiated', severity: 'success' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Operation failed';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleRunCycle = async () => {
    try {
      const result = await cycleMutation.mutateAsync();
      const summary = result.summary;
      setSnackbar({
        open: true,
        message: `Cycle complete: ${summary.initiated} initiated, ${summary.activated} activated, ${summary.completed} completed`,
        severity: summary.errors > 0 ? 'error' : 'success',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Cycle failed';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          SAML Certificate Rotation
        </Typography>
        <Tooltip title="Run a full rotation cycle (evaluate + process all states)">
          <Button
            variant="contained"
            startIcon={cycleMutation.isPending ? <CircularProgress size={18} /> : <AutorenewIcon />}
            onClick={handleRunCycle}
            disabled={cycleMutation.isPending}
          >
            Run Rotation Cycle
          </Button>
        </Tooltip>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        {(['staged', 'notified', 'activated', 'completed', 'failed'] as const).map((state) => (
          <Grid item xs={6} sm={4} md key={state}>
            <Card sx={{ borderLeft: `4px solid ${ROTATION_STATE_COLORS[state]}` }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight={700}>
                  {stateCounts[state] || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {ROTATION_STATE_LABELS[state]}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab
          label={`Eligible Apps (${eligible.filter((e) => !e.hasActiveRotation && !e.isExcluded).length})`}
          icon={<PlayArrowIcon />}
          iconPosition="start"
        />
        <Tab
          label={`Active Rotations (${activeRotations.length})`}
          icon={<RefreshIcon />}
          iconPosition="start"
        />
        <Tab
          label={`History (${completedRotations.length})`}
          icon={<HistoryIcon />}
          iconPosition="start"
        />
      </Tabs>

      {/* Eligible Apps Tab */}
      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>App Name</TableCell>
                <TableCell>Current Thumbprint</TableCell>
                <TableCell>Expires On</TableCell>
                <TableCell>Days Left</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eligibleLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell>
                </TableRow>
              ) : eligible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">No apps approaching certificate expiration</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                eligible.map((app) => (
                  <TableRow key={app.servicePrincipalId}>
                    <TableCell>
                      <Typography fontWeight={600}>{app.appDisplayName || 'Unknown'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        SP: {app.servicePrincipalId.slice(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                        {app.currentThumbprint ? `${app.currentThumbprint.slice(0, 16)}...` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(app.expiresOn)}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${app.daysUntilExpiration}d`}
                        size="small"
                        color={app.daysUntilExpiration <= 14 ? 'error' : app.daysUntilExpiration <= 30 ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {app.isExcluded ? (
                        <Chip label="Excluded" size="small" variant="outlined" />
                      ) : app.hasActiveRotation ? (
                        <Chip label="Rotation Active" size="small" color="info" />
                      ) : (
                        <Chip label="Eligible" size="small" color="success" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Initiate certificate rotation">
                        <span>
                          <IconButton
                            color="primary"
                            disabled={app.hasActiveRotation || app.isExcluded || initiateMutation.isPending}
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                type: 'initiate',
                                spId: app.servicePrincipalId,
                                appName: app.appDisplayName,
                              })
                            }
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Active Rotations Tab */}
      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>App Name</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Old Thumbprint</TableCell>
                <TableCell>New Thumbprint</TableCell>
                <TableCell>Initiated</TableCell>
                <TableCell>By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rotationsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell>
                </TableRow>
              ) : activeRotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">No active rotations</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                activeRotations.map((rotation) => (
                  <TableRow key={rotation.id}>
                    <TableCell>
                      <Typography fontWeight={600}>{rotation.appDisplayName || 'Unknown'}</Typography>
                    </TableCell>
                    <TableCell><RotationStateChip state={rotation.state} /></TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                        {rotation.oldThumbprint ? `${rotation.oldThumbprint.slice(0, 12)}...` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                        {rotation.newThumbprint ? `${rotation.newThumbprint.slice(0, 12)}...` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(rotation.initiatedAt)}</TableCell>
                    <TableCell>{rotation.initiatedBy}</TableCell>
                    <TableCell align="right">
                      {(rotation.state === 'staged' || rotation.state === 'notified') && (
                        <>
                          <Tooltip title="Activate now">
                            <IconButton
                              color="success"
                              onClick={() =>
                                setConfirmDialog({ open: true, type: 'activate', id: rotation.id })
                              }
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel rotation">
                            <IconButton
                              color="error"
                              onClick={() =>
                                setConfirmDialog({ open: true, type: 'cancel', id: rotation.id })
                              }
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* History Tab */}
      {tab === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>App Name</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Initiated</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell>By</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rotationsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell>
                </TableRow>
              ) : completedRotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">No rotation history</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                completedRotations.map((rotation) => (
                  <TableRow key={rotation.id}>
                    <TableCell>
                      <Typography fontWeight={600}>{rotation.appDisplayName || 'Unknown'}</Typography>
                    </TableCell>
                    <TableCell><RotationStateChip state={rotation.state} /></TableCell>
                    <TableCell>{formatDate(rotation.initiatedAt)}</TableCell>
                    <TableCell>
                      {formatDate(rotation.completedAt || rotation.cancelledAt || rotation.failedAt)}
                    </TableCell>
                    <TableCell>{rotation.initiatedBy}</TableCell>
                    <TableCell>
                      {rotation.state === 'failed' && (
                        <Typography variant="body2" color="error.main">
                          {rotation.failureReason}
                        </Typography>
                      )}
                      {rotation.state === 'cancelled' && (
                        <Typography variant="body2" color="text.secondary">
                          Cancelled by {rotation.cancelledBy}
                        </Typography>
                      )}
                      {rotation.state === 'completed' && (
                        <Typography variant="body2" color="success.main">
                          New cert: {rotation.newThumbprint?.slice(0, 12)}...
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {confirmDialog.type === 'activate' && 'Activate Rotation'}
          {confirmDialog.type === 'cancel' && 'Cancel Rotation'}
          {confirmDialog.type === 'initiate' && 'Initiate Rotation'}
        </DialogTitle>
        <DialogContent>
          {confirmDialog.type === 'activate' && (
            <Alert severity="warning">
              Activating will set the new certificate as the active SAML signing cert.
              SPs that haven't updated their trust configuration may experience authentication failures.
            </Alert>
          )}
          {confirmDialog.type === 'cancel' && (
            <Alert severity="info">
              This will cancel the rotation and remove the staged certificate.
            </Alert>
          )}
          {confirmDialog.type === 'initiate' && (
            <Alert severity="info">
              This will generate a new SAML signing certificate for "{confirmDialog.appName}".
              The new cert will be staged (inactive) until manually activated or the grace period elapses.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirmDialog.type === 'cancel' ? 'error' : 'primary'}
            onClick={handleConfirm}
          >
            Confirm
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
