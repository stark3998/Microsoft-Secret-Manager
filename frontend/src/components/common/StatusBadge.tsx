import { Box, Typography } from '@mui/material';
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/constants';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] || '#9CA3AF';
  const label = STATUS_LABELS[status] || status;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.625,
        px: 1,
        py: 0.375,
        borderRadius: '6px',
        backgroundColor: `${color}0D`,
        border: `1px solid ${color}1A`,
        transition: 'all 0.15s ease',
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
      <Typography sx={{
        fontSize: size === 'small' ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        color,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
      }}>
        {label}
      </Typography>
    </Box>
  );
}
