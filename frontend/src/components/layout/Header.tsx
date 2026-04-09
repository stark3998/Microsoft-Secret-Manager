import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Box, Typography, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNoneOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import { useAuth } from '../../auth/useAuth';
import { ROUTES } from '../../utils/constants';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const topBarIcon = {
    color: '#F3F2F1',
    borderRadius: 0,
    px: 1.25,
    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        backgroundColor: '#1B1A19',
        borderBottom: 'none',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 40, px: 1 }}>
        {/* Azure branding */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1 }}
          onClick={() => navigate(ROUTES.DASHBOARD)}
        >
          <Box sx={{
            width: 16, height: 16, borderRadius: '2px',
            background: 'linear-gradient(135deg, #0078D4 0%, #50e6ff 100%)',
          }} />
          <Typography sx={{
            fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF',
            letterSpacing: '-0.01em', userSelect: 'none',
          }}>
            Secret Manager
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Right-side toolbar icons */}
        <Box display="flex" alignItems="center">
          <Tooltip title="Notifications">
            <IconButton size="small" sx={topBarIcon}>
              <NotificationsNoneIcon sx={{ fontSize: '1.125rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton size="small" sx={topBarIcon} onClick={() => navigate(ROUTES.SETTINGS)}>
              <SettingsIcon sx={{ fontSize: '1.125rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Help">
            <IconButton size="small" sx={topBarIcon}>
              <HelpOutlineIcon sx={{ fontSize: '1.125rem' }} />
            </IconButton>
          </Tooltip>

          <Box sx={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.15)', mx: 1 }} />

          {/* User */}
          <Box
            onClick={() => navigate(ROUTES.PROFILE)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
              borderRadius: 0, px: 1, py: 0.5,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <Box sx={{
              width: 28, height: 28, borderRadius: '50%',
              backgroundColor: '#0078D4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 600, color: '#FFFFFF',
            }}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </Box>
            <Typography sx={{ fontSize: '0.8125rem', color: '#F3F2F1', display: { xs: 'none', sm: 'block' } }}>
              {user?.name || user?.email || 'User'}
            </Typography>
          </Box>

          <Tooltip title="Sign out">
            <IconButton size="small" sx={{ ...topBarIcon, ml: 0.5 }} onClick={logout}>
              <LogoutIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
