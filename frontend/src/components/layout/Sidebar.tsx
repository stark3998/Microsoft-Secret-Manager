import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import RadarIcon from '@mui/icons-material/RadarOutlined';
import VpnKeyIcon from '@mui/icons-material/VpnKeyOutlined';
import AppRegistrationIcon from '@mui/icons-material/AppRegistrationOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import SecurityIcon from '@mui/icons-material/SecurityOutlined';
import AutorenewIcon from '@mui/icons-material/AutorenewOutlined';
import WebhookIcon from '@mui/icons-material/WebhookOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import { useAuth } from '../../auth/useAuth';
import { ROUTES } from '../../utils/constants';

const DRAWER_WIDTH = 220;

const mainNav = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: <DashboardIcon /> },
  { label: 'Scans', path: ROUTES.SCANS, icon: <RadarIcon /> },
  { label: 'Key Vault Items', path: ROUTES.KEYVAULT_ITEMS, icon: <VpnKeyIcon /> },
  { label: 'App Registrations', path: ROUTES.APP_REGISTRATIONS, icon: <AppRegistrationIcon /> },
  { label: 'Enterprise Apps', path: ROUTES.ENTERPRISE_APPS, icon: <BusinessIcon /> },
];

const adminNav = [
  { label: 'Certificates', path: ROUTES.CERTIFICATES, icon: <SecurityIcon /> },
  { label: 'SAML Rotation', path: ROUTES.SAML_ROTATION, icon: <AutorenewIcon /> },
  { label: 'Event Grid', path: ROUTES.EVENTGRID_CONFIG, icon: <WebhookIcon /> },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: <SettingsIcon /> },
];

function NavItem({ label, icon, selected, onClick }: {
  label: string; path?: string; icon: React.ReactNode; selected: boolean; onClick: () => void;
}) {
  return (
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
        borderRadius: 0,
        mb: 0,
        py: 0.875,
        px: 2,
        borderLeft: selected ? '3px solid #0078D4' : '3px solid transparent',
        transition: 'all 0.1s ease',
        '&.Mui-selected': {
          backgroundColor: '#1E293B',
          '&:hover': { backgroundColor: '#1E293B' },
        },
        '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' },
      }}
    >
      <ListItemIcon sx={{
        color: selected ? '#60A5FA' : '#6B7280',
        minWidth: 32,
        '& .MuiSvgIcon-root': { fontSize: '1.125rem' },
      }}>
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={label}
        sx={{
          '& .MuiTypography-root': {
            fontSize: '0.8125rem',
            fontWeight: selected ? 500 : 400,
            color: selected ? '#F9FAFB' : '#9CA3AF',
          },
        }}
      />
    </ListItemButton>
  );
}

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
          backgroundColor: '#111827',
          borderRight: 'none',
          overflow: 'hidden',
        },
      }}
    >
      {/* Logo area */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 48 }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: '6px',
          background: 'linear-gradient(135deg, #0078D4 0%, #106EBE 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <VpnKeyIcon sx={{ color: '#fff', fontSize: '0.875rem' }} />
        </Box>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#F9FAFB', letterSpacing: '-0.01em' }}>
          Secret Manager
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* Main nav */}
      <Box sx={{ pt: 1 }}>
        <Typography sx={{ px: 2, py: 0.75, fontSize: '0.625rem', fontWeight: 600, color: '#4B5563', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Overview
        </Typography>
        <List disablePadding>
          {mainNav.map((item) => (
            <NavItem
              key={item.path}
              {...item}
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            />
          ))}
        </List>
      </Box>

      {/* Admin nav */}
      {user?.isAdmin && (
        <Box sx={{ pt: 1.5 }}>
          <Typography sx={{ px: 2, py: 0.75, fontSize: '0.625rem', fontWeight: 600, color: '#4B5563', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Management
          </Typography>
          <List disablePadding>
            {adminNav.map((item) => (
              <NavItem
                key={item.path}
                {...item}
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              />
            ))}
          </List>
        </Box>
      )}
    </Drawer>
  );
}

export { DRAWER_WIDTH };
