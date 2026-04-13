import { Box, Typography, Button, type SxProps, type Theme } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  sx?: SxProps<Theme>;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  sx,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
        ...sx,
      }}
    >
      <Box sx={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        backgroundColor: 'action.hover',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 2,
        color: 'text.secondary',
      }}>
        {icon || <InboxOutlinedIcon sx={{ fontSize: 32 }} />}
      </Box>
      <Typography variant="h6" sx={{ mb: 0.5, color: 'text.primary' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 400, mb: actionLabel ? 2 : 0 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" size="small" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}

export function SearchEmptyState({ search }: { search?: string }) {
  return (
    <EmptyState
      icon={<SearchOffIcon sx={{ fontSize: 32 }} />}
      title="No results found"
      description={search ? `No items match "${search}". Try adjusting your filters or search terms.` : 'No items match your current filters.'}
    />
  );
}
