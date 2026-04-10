import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, TextField, Alert,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/WarningAmberOutlined';
import { ActivityBadge } from './ActivityBadge';

interface DisableConfirmDialogProps {
  open: boolean;
  appDisplayName: string;
  appId: string;
  classification: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function DisableConfirmDialog({
  open, appDisplayName, appId, classification, onConfirm, onCancel, loading,
}: DisableConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText.toLowerCase() === 'disable';

  const handleClose = () => {
    setConfirmText('');
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon sx={{ color: '#D13438' }} />
        Disable Application
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Disabling this application will prevent all users and services from signing in.
          This action can be reversed by re-enabling the service principal.
        </Alert>

        <Box sx={{ mb: 2, p: 2, backgroundColor: '#FAF9F8', border: '1px solid #EDEBE9', borderRadius: '2px' }}>
          <Typography sx={{ fontSize: '0.8125rem', color: '#605E5C', mb: 0.5 }}>Application</Typography>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>{appDisplayName}</Typography>

          <Typography sx={{ fontSize: '0.8125rem', color: '#605E5C', mb: 0.5 }}>App ID</Typography>
          <Typography sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#605E5C', mb: 1 }}>{appId}</Typography>

          <Typography sx={{ fontSize: '0.8125rem', color: '#605E5C', mb: 0.5 }}>Current Classification</Typography>
          <ActivityBadge classification={classification} size="medium" />
        </Box>

        <Typography sx={{ fontSize: '0.8125rem', mb: 1 }}>
          Type <strong>disable</strong> to confirm:
        </Typography>
        <TextField
          size="small"
          fullWidth
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="disable"
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={!isConfirmed || loading}
        >
          {loading ? 'Disabling...' : 'Disable Application'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
