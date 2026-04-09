import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Sidebar, DRAWER_WIDTH } from './Sidebar';
import { Header } from './Header';

export function AppShell() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FAF9F8' }}>
      <Header />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, sm: 2.5, md: 3 },
          py: 2.5,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          overflow: 'auto',
        }}
      >
        {/* Offset for fixed top bar */}
        <Toolbar variant="dense" sx={{ minHeight: 40 }} />
        <Outlet />
      </Box>
    </Box>
  );
}
