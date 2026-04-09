import { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import TableChartIcon from '@mui/icons-material/TableChartOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { exportCsv, exportPdf } from '../../api/export';

interface ExportToolbarProps {
  filters?: Record<string, string>;
}

export function ExportToolbar({ filters }: ExportToolbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setAnchorEl(null);
    setLoading(true);
    try {
      const data = format === 'csv' ? await exportCsv(filters) : await exportPdf(filters);
      const blob = new Blob([data], {
        type: format === 'csv' ? 'text/csv' : 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `secret-manager-export.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={14} sx={{ color: '#9CA3AF' }} /> : <FileDownloadIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={loading}
        size="small"
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 160, border: '1px solid #E5E7EB', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' } } }}
      >
        <MenuItem onClick={() => handleExport('csv')} sx={{ fontSize: '0.8125rem', py: 1 }}>
          <ListItemIcon><TableChartIcon sx={{ fontSize: '1rem', color: '#6B7280' }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>CSV</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('pdf')} sx={{ fontSize: '0.8125rem', py: 1 }}>
          <ListItemIcon><PictureAsPdfIcon sx={{ fontSize: '1rem', color: '#6B7280' }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>PDF</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
