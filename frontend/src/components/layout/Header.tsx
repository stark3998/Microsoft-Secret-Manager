import { AppBar, Toolbar, Typography, Box, Chip, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../../auth/useAuth';
import { DRAWER_WIDTH } from './Sidebar';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <AppBar
      position="fixed"
      sx={{
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
        ml: `${DRAWER_WIDTH}px`,
        backgroundColor: '#fff',
        color: '#333',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <Toolbar>
        <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 600 }}>
          Azure Secret Management
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            icon={<PersonIcon />}
            label={user?.name || user?.email || 'User'}
            variant="outlined"
            size="small"
          />
          <Chip
            label={user?.isAdmin ? 'Admin' : 'Viewer'}
            size="small"
            color={user?.isAdmin ? 'primary' : 'default'}
          />
          <Tooltip title="Sign out">
            <IconButton onClick={logout} size="small">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
