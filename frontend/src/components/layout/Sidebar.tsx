import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import BusinessIcon from '@mui/icons-material/Business';
import SecurityIcon from '@mui/icons-material/Security';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../../auth/useAuth';
import { ROUTES } from '../../utils/constants';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: <DashboardIcon /> },
  { label: 'Key Vault Items', path: ROUTES.KEYVAULT_ITEMS, icon: <VpnKeyIcon /> },
  { label: 'App Registrations', path: ROUTES.APP_REGISTRATIONS, icon: <AppRegistrationIcon /> },
  { label: 'Enterprise Apps', path: ROUTES.ENTERPRISE_APPS, icon: <BusinessIcon /> },
  { label: 'Certificates', path: ROUTES.CERTIFICATES, icon: <SecurityIcon /> },
  { label: 'SAML Rotation', path: ROUTES.SAML_ROTATION, icon: <AutorenewIcon /> },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#1a1a2e',
          color: '#fff',
        },
      }}
    >
      <Toolbar>
        <Box display="flex" alignItems="center" gap={1}>
          <VpnKeyIcon sx={{ color: '#4fc3f7' }} />
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: '#fff' }}>
            Secret Manager
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <List sx={{ px: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              '&.Mui-selected': {
                backgroundColor: 'rgba(79, 195, 247, 0.15)',
                '&:hover': { backgroundColor: 'rgba(79, 195, 247, 0.25)' },
              },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? '#4fc3f7' : 'rgba(255,255,255,0.7)', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} sx={{ '& .MuiTypography-root': { fontSize: '0.9rem' } }} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      {user?.isAdmin && (
        <List sx={{ px: 1 }}>
          <ListItemButton
            selected={location.pathname === ROUTES.SETTINGS}
            onClick={() => navigate(ROUTES.SETTINGS)}
            sx={{
              borderRadius: 1,
              '&.Mui-selected': { backgroundColor: 'rgba(79, 195, 247, 0.15)' },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === ROUTES.SETTINGS ? '#4fc3f7' : 'rgba(255,255,255,0.7)', minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" sx={{ '& .MuiTypography-root': { fontSize: '0.9rem' } }} />
          </ListItemButton>
        </List>
      )}
    </Drawer>
  );
}

export { DRAWER_WIDTH };
