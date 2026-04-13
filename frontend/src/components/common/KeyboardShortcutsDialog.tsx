import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, Chip,
  Table, TableBody, TableCell, TableRow, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/KeyboardOutlined';

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Open command palette' },
  { keys: ['/'], description: 'Focus search' },
  { keys: ['Shift', 'G'], description: 'Go to Dashboard' },
  { keys: ['Shift', 'S'], description: 'Go to Scans' },
  { keys: ['Shift', 'V'], description: 'Go to Key Vault Items' },
  { keys: ['Shift', 'R'], description: 'Go to App Registrations' },
  { keys: ['?'], description: 'Show this dialog' },
  { keys: ['Esc'], description: 'Close dialogs' },
];

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('show-shortcuts', handler);
    return () => window.removeEventListener('show-shortcuts', handler);
  }, []);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem' }}>
        <KeyboardIcon sx={{ fontSize: '1.25rem' }} />
        Keyboard Shortcuts
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={() => setOpen(false)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Table size="small">
          <TableBody>
            {SHORTCUTS.map((s, i) => (
              <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell sx={{ width: 140 }}>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {s.keys.map((k) => (
                      <Chip
                        key={k}
                        label={k}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          height: 22,
                          fontFamily: 'monospace',
                          borderRadius: 1,
                        }}
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: '0.8125rem' }}>{s.description}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
