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
  Toolbar,
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

const DRAWER_WIDTH = 240;

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
  label: string; icon: React.ReactNode; selected: boolean; onClick: () => void;
}) {
  return (
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
        borderRadius: 0,
        mb: 0,
        py: 0.75,
        px: 2,
        borderLeft: selected ? '3px solid #0078D4' : '3px solid transparent',
        transition: 'none',
        '&.Mui-selected': {
          backgroundColor: '#3B3A39',
          '&:hover': { backgroundColor: '#3B3A39' },
        },
        '&:hover': { backgroundColor: '#323130' },
      }}
    >
      <ListItemIcon sx={{
        color: selected ? '#0078D4' : '#A19F9D',
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
            fontWeight: selected ? 600 : 400,
            color: selected ? '#FFFFFF' : '#D2D0CE',
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
          backgroundColor: '#252423',
          borderRight: '1px solid #3B3A39',
          overflow: 'hidden',
        },
      }}
    >
      {/* Offset for the top bar */}
      <Toolbar variant="dense" sx={{ minHeight: 40 }} />

      {/* Main nav */}
      <Box sx={{ pt: 0.5 }}>
        <Typography sx={{
          px: 2, py: 0.75, fontSize: '0.6875rem', fontWeight: 600,
          color: '#A19F9D', letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          Monitor
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

      <Divider sx={{ borderColor: '#3B3A39', my: 0.5 }} />

      {/* Admin nav */}
      {user?.isAdmin && (
        <Box>
          <Typography sx={{
            px: 2, py: 0.75, fontSize: '0.6875rem', fontWeight: 600,
            color: '#A19F9D', letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            Manage
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
