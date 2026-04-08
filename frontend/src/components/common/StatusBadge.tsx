import { Chip } from '@mui/material';
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/constants';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] || '#9e9e9e';
  const label = STATUS_LABELS[status] || status;

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        backgroundColor: `${color}20`,
        color: color,
        fontWeight: 600,
        borderColor: color,
      }}
      variant="outlined"
    />
  );
}
