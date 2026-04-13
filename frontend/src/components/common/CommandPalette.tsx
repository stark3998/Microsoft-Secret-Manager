import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog, DialogContent, InputBase, List, ListItemButton,
  ListItemIcon, ListItemText, Typography, Box, Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import VpnKeyIcon from '@mui/icons-material/VpnKeyOutlined';
import AppRegistrationIcon from '@mui/icons-material/AppRegistrationOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import RadarIcon from '@mui/icons-material/RadarOutlined';
import SecurityIcon from '@mui/icons-material/SecurityOutlined';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    { id: 'dashboard', label: 'Go to Dashboard', description: 'Overview of all secrets and certificates', icon: <DashboardIcon />, action: () => navigate(ROUTES.DASHBOARD), category: 'Navigation' },
    { id: 'scans', label: 'Go to Scans', description: 'View scan history and trigger scans', icon: <RadarIcon />, action: () => navigate(ROUTES.SCANS), category: 'Navigation' },
    { id: 'keyvault', label: 'Go to Key Vault Items', description: 'Browse Key Vault secrets, keys, and certificates', icon: <VpnKeyIcon />, action: () => navigate(ROUTES.KEYVAULT_ITEMS), category: 'Navigation' },
    { id: 'appreg', label: 'Go to App Registrations', description: 'App Registration credentials', icon: <AppRegistrationIcon />, action: () => navigate(ROUTES.APP_REGISTRATIONS), category: 'Navigation' },
    { id: 'enterprise', label: 'Go to Enterprise Apps', description: 'Enterprise Application certificates', icon: <BusinessIcon />, action: () => navigate(ROUTES.ENTERPRISE_APPS), category: 'Navigation' },
    { id: 'inventory', label: 'Go to App Inventory', description: 'Application activity and usage', icon: <BusinessIcon />, action: () => navigate(ROUTES.APP_INVENTORY), category: 'Navigation' },
    { id: 'certs', label: 'Go to Certificates', description: 'ACME certificate management', icon: <SecurityIcon />, action: () => navigate(ROUTES.CERTIFICATES), category: 'Navigation' },
    { id: 'settings', label: 'Go to Settings', description: 'Configure thresholds, notifications, schedule', icon: <SettingsIcon />, action: () => navigate(ROUTES.SETTINGS), category: 'Navigation' },
    { id: 'search-kv', label: 'Search Key Vault Items', description: 'Navigate to Key Vault Items with search focus', icon: <SearchIcon />, action: () => navigate(ROUTES.KEYVAULT_ITEMS + '?focus=search'), category: 'Actions' },
    { id: 'search-ar', label: 'Search App Registrations', description: 'Navigate to App Registrations with search focus', icon: <SearchIcon />, action: () => navigate(ROUTES.APP_REGISTRATIONS + '?focus=search'), category: 'Actions' },
  ];

  const filtered = query
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    },
    [open]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      setQuery('');
      item.action();
    },
    []
  );

  const handleDialogKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    },
    [filtered, selectedIndex, handleSelect]
  );

  // Group by category
  const groups: Record<string, CommandItem[]> = {};
  for (const item of filtered) {
    (groups[item.category] ??= []).push(item);
  }

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '20%',
          borderRadius: 2,
          overflow: 'hidden',
          maxHeight: '60vh',
        },
      }}
      onKeyDown={handleDialogKeyDown}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
        <InputBase
          ref={inputRef}
          autoFocus
          fullWidth
          placeholder="Search commands... (type to filter)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ fontSize: '0.875rem' }}
        />
        <Chip
          label="Esc"
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.625rem', height: 20, ml: 1 }}
        />
      </Box>
      <DialogContent sx={{ p: 0, maxHeight: '50vh' }}>
        {Object.entries(groups).map(([category, items]) => (
          <Box key={category}>
            <Typography
              sx={{
                px: 2, py: 0.75, fontSize: '0.6875rem', fontWeight: 600,
                color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}
            >
              {category}
            </Typography>
            <List disablePadding dense>
              {items.map((item) => {
                const globalIdx = filtered.indexOf(item);
                return (
                  <ListItemButton
                    key={item.id}
                    selected={globalIdx === selectedIndex}
                    onClick={() => handleSelect(item)}
                    sx={{ px: 2, py: 0.75 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary', '& .MuiSvgIcon-root': { fontSize: '1.125rem' } }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.description}
                      primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}
                      secondaryTypographyProps={{ fontSize: '0.6875rem' }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
        {filtered.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              No commands found for "{query}"
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
