import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Sidebar, DRAWER_WIDTH } from './Sidebar';
import { Header } from './Header';

export function AppShell() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F0F2F5' }}>
      <Sidebar />
      <Header />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, sm: 2.5, md: 3 },
          py: { xs: 2, sm: 2.5 },
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          mt: '48px',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
