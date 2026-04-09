import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={10}>
      <CircularProgress size={24} thickness={4} sx={{ color: '#0078D4' }} />
      <Typography sx={{ mt: 1.5, fontSize: '0.8125rem', color: '#9CA3AF' }}>
        {message}
      </Typography>
    </Box>
  );
}
