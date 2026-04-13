import { useState } from 'react';
import {
  Box, Chip, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField,
} from '@mui/material';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorderOutlined';
import type { SavedView } from '../../hooks/useSavedViews';

interface SavedViewsBarProps {
  views: SavedView[];
  currentFilters: Record<string, string>;
  onApplyView: (filters: Record<string, string>) => void;
  onSaveView: (name: string, filters: Record<string, string>) => void;
  onDeleteView: (id: string) => void;
}

export function SavedViewsBar({ views, currentFilters, onApplyView, onSaveView, onDeleteView }: SavedViewsBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewName, setViewName] = useState('');

  const hasFilters = Object.values(currentFilters).some((v) => v && v.length > 0);

  const handleSave = () => {
    if (viewName.trim()) {
      onSaveView(viewName.trim(), currentFilters);
      setViewName('');
      setDialogOpen(false);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        {views.map((view) => (
          <Chip
            key={view.id}
            label={view.name}
            size="small"
            variant="outlined"
            onClick={() => onApplyView(view.filters)}
            onDelete={() => onDeleteView(view.id)}
            sx={{ fontSize: '0.75rem' }}
          />
        ))}
        {hasFilters && (
          <Tooltip title="Save current filters as view">
            <IconButton size="small" onClick={() => setDialogOpen(true)}>
              <BookmarkBorderIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem' }}>Save View</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="View name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            size="small"
            sx={{ mt: 1 }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} size="small">Cancel</Button>
          <Button onClick={handleSave} variant="contained" size="small" disabled={!viewName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
