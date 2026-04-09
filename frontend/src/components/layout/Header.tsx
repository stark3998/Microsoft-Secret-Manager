import { AppBar, Toolbar, Box, Typography, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import { useAuth } from '../../auth/useAuth';
import { DRAWER_WIDTH } from './Sidebar';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
        ml: `${DRAWER_WIDTH}px`,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 48, px: 2.5 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#111827', lineHeight: 1.3 }}>
              {user?.name || user?.email || 'User'}
            </Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: '#6B7280', lineHeight: 1.2 }}>
              {user?.isAdmin ? 'Administrator' : 'Viewer'}
            </Typography>
          </Box>
          <Box sx={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0078D4 0%, #106EBE 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 600, color: '#FFFFFF',
          }}>
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </Box>
          <Tooltip title="Sign out">
            <IconButton
              onClick={logout}
              size="small"
              sx={{
                color: '#6B7280',
                '&:hover': { color: '#374151', backgroundColor: '#F3F4F6' },
              }}
            >
              <LogoutIcon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
