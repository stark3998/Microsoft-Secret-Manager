import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface PageHeaderProps {
  title: string;
  description?: string;
  helpUrl?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, helpUrl, action }: PageHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h4">{title}</Typography>
          {helpUrl && (
            <Tooltip title="Learn more about this page">
              <IconButton
                size="small"
                onClick={() => window.open(helpUrl, '_blank', 'noopener')}
                sx={{ color: 'text.secondary' }}
              >
                <HelpOutlineIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        {description && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Box>
  );
}
