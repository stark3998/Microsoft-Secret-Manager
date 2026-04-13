import { useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Box } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/HomeOutlined';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/scans': 'Scans',
  '/keyvault-items': 'Key Vault Items',
  '/app-registrations': 'App Registrations',
  '/enterprise-apps': 'Enterprise Apps',
  '/app-inventory': 'App Inventory',
  '/certificates': 'Certificates',
  '/saml-rotation': 'SAML Rotation',
  '/eventgrid-config': 'Event Grid',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

export function AppBreadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/') return null;

  const segments = location.pathname.split('/').filter(Boolean);
  const crumbs: { path: string; label: string }[] = [
    { path: '/', label: 'Home' },
  ];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = ROUTE_LABELS[currentPath] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ path: currentPath, label });
  }

  return (
    <Box sx={{ mb: 1.5 }}>
      <MuiBreadcrumbs
        separator={<NavigateNextIcon sx={{ fontSize: '0.875rem' }} />}
        sx={{ '& .MuiBreadcrumbs-separator': { mx: 0.5 } }}
      >
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return isLast ? (
            <Typography
              key={crumb.path}
              sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary' }}
            >
              {crumb.label}
            </Typography>
          ) : (
            <Link
              key={crumb.path}
              component="button"
              onClick={() => navigate(crumb.path)}
              underline="hover"
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                border: 'none',
                background: 'none',
              }}
            >
              {index === 0 && <HomeIcon sx={{ fontSize: '0.875rem' }} />}
              {crumb.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
}
