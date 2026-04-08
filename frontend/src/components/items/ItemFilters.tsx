import { Box, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

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
    <Box display="flex" gap={2} mb={2} flexWrap="wrap">
      <TextField
        label="Search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        size="small"
        sx={{ minWidth: 250 }}
        placeholder="Search by name..."
      />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Status</InputLabel>
        <Select value={status} label="Status" onChange={(e) => onStatusChange(e.target.value)}>
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {extraFilters}
    </Box>
  );
}
