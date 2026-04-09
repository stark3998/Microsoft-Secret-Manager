import { useState } from 'react';
import {
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, TextField, Select, MenuItem, FormControl,
  InputLabel, Box, Typography, Divider,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SnoozeIcon from '@mui/icons-material/SnoozeOutlined';
import UndoIcon from '@mui/icons-material/UndoOutlined';
import { useAcknowledge, useSnooze, useUnacknowledge } from '../../hooks/useAcknowledgment';

interface AcknowledgeActionsProps {
  itemId: string;
  partitionKey: string;
  acknowledged?: boolean;
  snoozedUntil?: string;
}

export function AcknowledgeActions({
  itemId, partitionKey, acknowledged, snoozedUntil,
}: AcknowledgeActionsProps) {
  const acknowledgeMutation = useAcknowledge();
  const snoozeMutation = useSnooze();
  const unacknowledgeMutation = useUnacknowledge();

  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeDays, setSnoozeDays] = useState(30);
  const [note, setNote] = useState('');

  const isSnoozed = snoozedUntil && new Date(snoozedUntil) > new Date();

  const handleAcknowledge = (e: React.MouseEvent) => {
    e.stopPropagation();
    acknowledgeMutation.mutate({ item_id: itemId, partition_key: partitionKey });
  };

  const handleUnacknowledge = (e: React.MouseEvent) => {
    e.stopPropagation();
    unacknowledgeMutation.mutate({ item_id: itemId, partition_key: partitionKey });
  };

  const handleSnooze = () => {
    snoozeMutation.mutate({ item_id: itemId, partition_key: partitionKey, snooze_days: snoozeDays, note });
    setSnoozeOpen(false);
    setNote('');
  };

  if (acknowledged || isSnoozed) {
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        {acknowledged && (
          <Typography sx={{
            fontSize: '0.625rem', fontWeight: 600, color: '#0284C7',
            px: 0.75, py: 0.25, borderRadius: '5px', backgroundColor: '#F0F9FF',
            border: '1px solid #BAE6FD',
          }}>
            ACK
          </Typography>
        )}
        {isSnoozed && (
          <Typography sx={{
            fontSize: '0.625rem', fontWeight: 600, color: '#D97706',
            px: 0.75, py: 0.25, borderRadius: '5px', backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
          }}>
            SNOOZED
          </Typography>
        )}
        <Tooltip title="Remove acknowledgment">
          <IconButton size="small" onClick={handleUnacknowledge} sx={{ color: '#9CA3AF' }}>
            <UndoIcon sx={{ fontSize: '0.875rem' }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <>
      <Box display="flex" gap={0}>
        <Tooltip title="Acknowledge">
          <IconButton size="small" onClick={handleAcknowledge} sx={{ color: '#9CA3AF', '&:hover': { color: '#059669' } }}>
            <CheckCircleOutlineIcon sx={{ fontSize: '0.95rem' }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Snooze">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSnoozeOpen(true); }}
            sx={{ color: '#9CA3AF', '&:hover': { color: '#D97706' } }}>
            <SnoozeIcon sx={{ fontSize: '0.95rem' }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog open={snoozeOpen} onClose={() => setSnoozeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ px: 3, pt: 2.5, pb: 0 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>Snooze Notifications</Typography>
        </DialogTitle>
        <Divider sx={{ mt: 2 }} />
        <DialogContent sx={{ px: 3, pt: 2.5 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Duration</InputLabel>
            <Select value={snoozeDays} onChange={(e) => setSnoozeDays(Number(e.target.value))} label="Duration">
              <MenuItem value={7}>7 days</MenuItem>
              <MenuItem value={14}>14 days</MenuItem>
              <MenuItem value={30}>30 days</MenuItem>
              <MenuItem value={60}>60 days</MenuItem>
              <MenuItem value={90}>90 days</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button size="small" onClick={() => setSnoozeOpen(false)}>Cancel</Button>
          <Button variant="contained" size="small" onClick={handleSnooze}>Snooze</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
