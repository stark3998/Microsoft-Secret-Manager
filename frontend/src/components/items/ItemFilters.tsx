import { Box, TextField, FormControl, InputLabel, Select, MenuItem, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/SearchOutlined';

interface ItemFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  extraFilters?: React.ReactNode;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'expired', label: 'Expired' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'notice', label: 'Notice' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'no_expiry', label: 'No Expiry' },
];

export function ItemFilters({ search, onSearchChange, status, onStatusChange, extraFilters }: ItemFiltersProps) {
  return (
    <Box sx={{
      display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center',
      p: 1, backgroundColor: '#FFFFFF', border: '1px solid #EDEBE9', borderRadius: '2px',
      boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
    }}>
      <TextField
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        size="small"
        placeholder="Filter by name..."
        sx={{
          minWidth: 260,
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#FFFFFF',
            fontSize: '0.8125rem',
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: '1rem', color: '#A19F9D' }} />
            </InputAdornment>
          ),
        }}
      />
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel sx={{ fontSize: '0.8125rem' }}>Status</InputLabel>
        <Select
          value={status}
          label="Status"
          onChange={(e) => onStatusChange(e.target.value)}
          sx={{ backgroundColor: '#FFFFFF', fontSize: '0.8125rem' }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8125rem' }}>{opt.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {extraFilters}
    </Box>
  );
}
