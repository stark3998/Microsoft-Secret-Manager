import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
      <Typography sx={{ fontSize: '5rem', fontWeight: 800, color: '#F3F4F6', lineHeight: 1, letterSpacing: '-0.04em' }}>
        404
      </Typography>
      <Typography sx={{ fontSize: '1rem', fontWeight: 500, color: '#6B7280', mt: 1.5 }}>
        The page you're looking for doesn't exist.
      </Typography>
      <Button variant="outlined" size="small" onClick={() => navigate('/')} sx={{ mt: 3 }}>
        Back to Dashboard
      </Button>
    </Box>
  );
}
