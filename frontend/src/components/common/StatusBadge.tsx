import { Box, Typography } from '@mui/material';
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/constants';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

const STATUS_ICONS: Record<string, string> = {
  expired: '\u2716',     // X
  critical: '\u26A0',    // warning sign
  warning: '\u25B2',     // triangle
  notice: '\u25CF',      // filled circle
  healthy: '\u2714',     // checkmark
  no_expiry: '\u2014',   // em dash
  unknown: '\u2014',
};

export function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] || '#8A8886';
  const label = STATUS_LABELS[status] || status;
  const icon = STATUS_ICONS[status] || '\u25CF';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: size === 'small' ? 0.75 : 1,
        py: 0.25,
        borderRadius: '2px',
        backgroundColor: `${color}14`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <Typography sx={{
        fontSize: size === 'small' ? '0.625rem' : '0.6875rem',
        lineHeight: 1,
        color,
      }}>
        {icon}
      </Typography>
      <Typography sx={{
        fontSize: size === 'small' ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        color,
        lineHeight: 1.4,
      }}>
        {label}
      </Typography>
    </Box>
  );
}
