import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Box, Typography, IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNoneOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../../auth/useAuth';
import { ROUTES } from '../../utils/constants';
import { useThemeMode } from '../../theme/ThemeContext';
import { headerColors } from '../../theme/palette';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();
  const hColors = headerColors[mode];
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const topBarIcon = {
    color: hColors.text,
    borderRadius: 0,
    px: 1.25,
    '&:hover': { backgroundColor: hColors.hoverBg },
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        backgroundColor: hColors.bg,
        borderBottom: 'none',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 40, px: 1 }}>
        {/* Hamburger menu for mobile */}
        {isMobile && (
          <IconButton size="small" sx={topBarIcon} onClick={onToggleSidebar}>
            <MenuIcon sx={{ fontSize: '1.25rem' }} />
          </IconButton>
        )}
        {/* Azure branding */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1 }}
          onClick={() => navigate(ROUTES.DASHBOARD)}
        >
          <Box sx={{
            width: 16, height: 16, borderRadius: '2px',
            background: mode === 'light'
              ? 'linear-gradient(135deg, #0078D4 0%, #50e6ff 100%)'
              : 'linear-gradient(135deg, #4DA3E8 0%, #50e6ff 100%)',
          }} />
          <Typography sx={{
            fontSize: '0.875rem', fontWeight: 600, color: hColors.text,
            letterSpacing: '-0.01em', userSelect: 'none',
          }}>
            Secret Manager
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Right-side toolbar icons */}
        <Box display="flex" alignItems="center">
          <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
            <IconButton size="small" sx={topBarIcon} onClick={toggleTheme}>
              {mode === 'light'
                ? <DarkModeOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                : <LightModeOutlinedIcon sx={{ fontSize: '1.125rem' }} />
              }
            </IconButton>
          </Tooltip>
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
              borderRadius: 0, px: 1.5, py: 0.5,
              '&:hover': { backgroundColor: hColors.hoverBg },
            }}
          >
            <Box sx={{
              width: 32, height: 32, minWidth: 32, borderRadius: '50%',
              backgroundColor: mode === 'light' ? '#0078D4' : '#4DA3E8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF',
              lineHeight: 1,
            }}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </Box>
            <Typography sx={{
              fontSize: '0.8125rem', color: hColors.text,
              display: { xs: 'none', sm: 'block' },
              whiteSpace: 'nowrap',
            }}>
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
