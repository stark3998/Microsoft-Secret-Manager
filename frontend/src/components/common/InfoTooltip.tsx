import { Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface InfoTooltipProps {
  text: string;
  size?: 'small' | 'medium';
}

export function InfoTooltip({ text, size = 'small' }: InfoTooltipProps) {
  return (
    <Tooltip title={text} arrow placement="top">
      <IconButton size={size} sx={{ color: 'text.secondary', p: 0.25, ml: 0.5 }}>
        <InfoOutlinedIcon sx={{ fontSize: size === 'small' ? '0.875rem' : '1.125rem' }} />
      </IconButton>
    </Tooltip>
  );
}
