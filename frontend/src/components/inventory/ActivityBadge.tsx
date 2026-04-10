import { Box, Typography } from '@mui/material';
import { ACTIVITY_COLORS, ACTIVITY_LABELS } from '../../utils/constants';

const ACTIVITY_ICONS: Record<string, string> = {
  active: '\u2714',        // checkmark
  low_activity: '\u25B2',  // triangle
  inactive: '\u25CF',      // filled circle
  zombie: '\u2620',        // skull
  disabled: '\u2716',      // X
};

interface ActivityBadgeProps {
  classification: string;
  size?: 'small' | 'medium';
}

export function ActivityBadge({ classification, size = 'small' }: ActivityBadgeProps) {
  const color = ACTIVITY_COLORS[classification] || '#8A8886';
  const label = ACTIVITY_LABELS[classification] || classification;
  const icon = ACTIVITY_ICONS[classification] || '\u25CF';

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
