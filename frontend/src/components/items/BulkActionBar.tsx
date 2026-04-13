import { Box, Button, Typography, Slide } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SnoozeIcon from '@mui/icons-material/Snooze';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

interface BulkActionBarProps {
  selectedCount: number;
  onAcknowledge?: () => void;
  onSnooze?: () => void;
  onExport?: () => void;
  onClearSelection?: () => void;
}

export function BulkActionBar({
  selectedCount,
  onAcknowledge,
  onSnooze,
  onExport,
  onClearSelection,
}: BulkActionBarProps) {
  return (
    <Slide direction="up" in={selectedCount > 0} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 1.25,
          backgroundColor: 'primary.main',
          color: '#fff',
          borderRadius: 2,
          boxShadow: '0 12.8px 28.8px 0 rgba(0,0,0,.25)',
          zIndex: 1300,
        }}
      >
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, mr: 1 }}>
          {selectedCount} selected
        </Typography>
        {onAcknowledge && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={onAcknowledge}
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' }, fontSize: '0.75rem' }}
          >
            Acknowledge
          </Button>
        )}
        {onSnooze && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<SnoozeIcon />}
            onClick={onSnooze}
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' }, fontSize: '0.75rem' }}
          >
            Snooze
          </Button>
        )}
        {onExport && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={onExport}
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' }, fontSize: '0.75rem' }}
          >
            Export
          </Button>
        )}
        {onClearSelection && (
          <Button
            size="small"
            onClick={onClearSelection}
            sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', '&:hover': { color: '#fff' } }}
          >
            Clear
          </Button>
        )}
      </Box>
    </Slide>
  );
}
