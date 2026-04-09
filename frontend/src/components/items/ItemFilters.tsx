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
    <Box display="flex" gap={1.5} mb={2.5} flexWrap="wrap" alignItems="center">
      <TextField
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        size="small"
        placeholder="Search items..."
        sx={{
          minWidth: 260,
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#FFFFFF',
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: '1.1rem', color: '#9CA3AF' }} />
            </InputAdornment>
          ),
        }}
      />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={status}
          label="Status"
          onChange={(e) => onStatusChange(e.target.value)}
          sx={{ backgroundColor: '#FFFFFF' }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {extraFilters}
    </Box>
  );
}
