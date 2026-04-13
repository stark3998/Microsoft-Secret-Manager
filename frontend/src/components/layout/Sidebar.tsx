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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import RadarIcon from '@mui/icons-material/RadarOutlined';
import VpnKeyIcon from '@mui/icons-material/VpnKeyOutlined';
import AppRegistrationIcon from '@mui/icons-material/AppRegistrationOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import Inventory2Icon from '@mui/icons-material/Inventory2Outlined';
import SecurityIcon from '@mui/icons-material/SecurityOutlined';
import AutorenewIcon from '@mui/icons-material/AutorenewOutlined';
import WebhookIcon from '@mui/icons-material/WebhookOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import { useAuth } from '../../auth/useAuth';
import { ROUTES } from '../../utils/constants';
import { useThemeMode } from '../../theme/ThemeContext';
import { sidebarColors } from '../../theme/palette';

const DRAWER_WIDTH = 240;

const mainNav = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: <DashboardIcon /> },
  { label: 'Scans', path: ROUTES.SCANS, icon: <RadarIcon /> },
  { label: 'Key Vault Items', path: ROUTES.KEYVAULT_ITEMS, icon: <VpnKeyIcon /> },
  { label: 'App Registrations', path: ROUTES.APP_REGISTRATIONS, icon: <AppRegistrationIcon /> },
  { label: 'Enterprise Apps', path: ROUTES.ENTERPRISE_APPS, icon: <BusinessIcon /> },
  { label: 'App Inventory', path: ROUTES.APP_INVENTORY, icon: <Inventory2Icon /> },
];

const adminNav = [
  { label: 'Certificates', path: ROUTES.CERTIFICATES, icon: <SecurityIcon /> },
  { label: 'SAML Rotation', path: ROUTES.SAML_ROTATION, icon: <AutorenewIcon /> },
  { label: 'Event Grid', path: ROUTES.EVENTGRID_CONFIG, icon: <WebhookIcon /> },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: <SettingsIcon /> },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onToggleMobile?: () => void;
}

function NavItem({ label, icon, selected, onClick, colors }: {
  label: string; icon: React.ReactNode; selected: boolean; onClick: () => void;
  colors: typeof sidebarColors['light'];
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
        borderLeft: selected ? `3px solid ${colors.selectedAccent}` : '3px solid transparent',
        transition: 'none',
        '&.Mui-selected': {
          backgroundColor: colors.selectedBg,
          '&:hover': { backgroundColor: colors.selectedBg },
        },
        '&:hover': { backgroundColor: colors.hoverBg },
      }}
    >
      <ListItemIcon sx={{
        color: selected ? colors.selectedAccent : colors.accentText,
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
            color: selected ? colors.selectedText : colors.text,
          },
        }}
      />
    </ListItemButton>
  );
}

export function Sidebar({ mobileOpen = false, onToggleMobile }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const colors = sidebarColors[mode];
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : true}
      onClose={onToggleMobile}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: colors.bg,
          borderRight: `1px solid ${colors.border}`,
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
          color: colors.accentText, letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          Monitor
        </Typography>
        <List disablePadding>
          {mainNav.map((item) => (
            <NavItem
              key={item.path}
              {...item}
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile && onToggleMobile) onToggleMobile();
              }}
              colors={colors}
            />
          ))}
        </List>
      </Box>

      <Divider sx={{ borderColor: colors.border, my: 0.5 }} />

      {/* Admin nav */}
      {user?.isAdmin && (
        <Box>
          <Typography sx={{
            px: 2, py: 0.75, fontSize: '0.6875rem', fontWeight: 600,
            color: colors.accentText, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            Manage
          </Typography>
          <List disablePadding>
            {adminNav.map((item) => (
              <NavItem
                key={item.path}
                {...item}
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile && onToggleMobile) onToggleMobile();
                }}
                colors={colors}
              />
            ))}
          </List>
        </Box>
      )}
    </Drawer>
  );
}

export { DRAWER_WIDTH };
