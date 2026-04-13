import { useState } from 'react';
import {
  IconButton, Tooltip, Popover, Box, Typography, Switch,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/TuneOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RestoreIcon from '@mui/icons-material/RestoreOutlined';
import type { DashboardWidget } from '../../hooks/useDashboardLayout';

interface DashboardCustomizerProps {
  widgets: DashboardWidget[];
  onToggle: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onReset: () => void;
}

export function DashboardCustomizer({ widgets, onToggle, onMove, onReset }: DashboardCustomizerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title="Customize dashboard">
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <TuneIcon sx={{ fontSize: '1.125rem' }} />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 280, p: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>Dashboard Widgets</Typography>
            <Tooltip title="Reset to defaults">
              <IconButton size="small" onClick={onReset}>
                <RestoreIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Divider sx={{ my: 0.5 }} />
          <List dense disablePadding>
            {widgets.map((widget, idx) => (
              <ListItem key={widget.id} sx={{ py: 0.25, px: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', mr: 0.5 }}>
                  <IconButton
                    size="small"
                    disabled={idx === 0}
                    onClick={() => onMove(widget.id, 'up')}
                    sx={{ p: 0, '& svg': { fontSize: '0.75rem' } }}
                  >
                    <ArrowUpwardIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={idx === widgets.length - 1}
                    onClick={() => onMove(widget.id, 'down')}
                    sx={{ p: 0, '& svg': { fontSize: '0.75rem' } }}
                  >
                    <ArrowDownwardIcon />
                  </IconButton>
                </Box>
                <ListItemText
                  primary={widget.title}
                  primaryTypographyProps={{ fontSize: '0.8125rem' }}
                />
                <ListItemSecondaryAction>
                  <Switch
                    size="small"
                    checked={widget.visible}
                    onChange={() => onToggle(widget.id)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      </Popover>
    </>
  );
}
