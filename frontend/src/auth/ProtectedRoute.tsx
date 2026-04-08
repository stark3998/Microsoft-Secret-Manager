import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Box, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'Admin' | 'Viewer';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole === 'Admin' && !user.isAdmin) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="60vh">
        <Typography variant="h5" color="error">
          Access Denied — Admin role required
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
