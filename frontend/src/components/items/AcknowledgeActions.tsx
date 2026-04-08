import { useState } from 'react';
import {
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, TextField, Select, MenuItem, FormControl,
  InputLabel, Chip, Box,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SnoozeIcon from '@mui/icons-material/Snooze';
import UndoIcon from '@mui/icons-material/Undo';
import { useAcknowledge, useSnooze, useUnacknowledge } from '../../hooks/useAcknowledgment';

interface AcknowledgeActionsProps {
  itemId: string;
  partitionKey: string;
  acknowledged?: boolean;
  snoozedUntil?: string;
}

export function AcknowledgeActions({
  itemId,
  partitionKey,
  acknowledged,
  snoozedUntil,
}: AcknowledgeActionsProps) {
  const acknowledgeMutation = useAcknowledge();
  const snoozeMutation = useSnooze();
  const unacknowledgeMutation = useUnacknowledge();

  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeDays, setSnoozeDays] = useState(30);
  const [note, setNote] = useState('');

  const isSnoozed = snoozedUntil && new Date(snoozedUntil) > new Date();

  const handleAcknowledge = () => {
    acknowledgeMutation.mutate({ item_id: itemId, partition_key: partitionKey });
  };

  const handleUnacknowledge = () => {
    unacknowledgeMutation.mutate({ item_id: itemId, partition_key: partitionKey });
  };

  const handleSnooze = () => {
    snoozeMutation.mutate({
      item_id: itemId,
      partition_key: partitionKey,
      snooze_days: snoozeDays,
      note,
    });
    setSnoozeOpen(false);
    setNote('');
  };

  if (acknowledged || isSnoozed) {
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        {acknowledged && (
          <Chip label="ACK" size="small" color="info" variant="outlined" />
        )}
        {isSnoozed && (
          <Chip label="Snoozed" size="small" color="warning" variant="outlined" />
        )}
        <Tooltip title="Remove acknowledgment">
          <IconButton size="small" onClick={handleUnacknowledge}>
            <UndoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <>
      <Box display="flex" gap={0.5}>
        <Tooltip title="Acknowledge">
          <IconButton size="small" onClick={handleAcknowledge}>
            <CheckCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Snooze">
          <IconButton size="small" onClick={() => setSnoozeOpen(true)}>
            <SnoozeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog open={snoozeOpen} onClose={() => setSnoozeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Snooze Notifications</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Snooze Duration</InputLabel>
            <Select value={snoozeDays} onChange={(e) => setSnoozeDays(Number(e.target.value))} label="Snooze Duration">
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
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnoozeOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSnooze}>Snooze</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
