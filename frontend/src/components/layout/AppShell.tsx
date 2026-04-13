import { useState } from 'react';
import { Box, Toolbar, useTheme, useMediaQuery } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Sidebar, DRAWER_WIDTH } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '../common/CommandPalette';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { KeyboardShortcutsDialog } from '../common/KeyboardShortcutsDialog';
import { AppBreadcrumbs } from '../common/Breadcrumbs';

export function AppShell() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  useKeyboardShortcuts();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <Header onToggleSidebar={() => setMobileOpen(!mobileOpen)} />
      <Sidebar mobileOpen={mobileOpen} onToggleMobile={() => setMobileOpen(!mobileOpen)} />
      <CommandPalette />
      <KeyboardShortcutsDialog />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, sm: 2.5, md: 3 },
          py: 2.5,
          width: isMobile ? '100%' : `calc(100% - ${DRAWER_WIDTH}px)`,
          overflow: 'auto',
        }}
      >
        {/* Offset for fixed top bar */}
        <Toolbar variant="dense" sx={{ minHeight: 40 }} />
        <AppBreadcrumbs />
        <Outlet />
      </Box>
    </Box>
  );
}
