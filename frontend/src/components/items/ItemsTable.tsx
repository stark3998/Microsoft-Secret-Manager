import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TablePagination, Typography, Box,
} from '@mui/material';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate, formatDaysUntilExpiration } from '../../utils/formatters';
import { ITEM_TYPE_LABELS, SOURCE_LABELS } from '../../utils/constants';

interface Column {
  key: string;
  label: string;
  render?: (item: Record<string, unknown>) => React.ReactNode;
}

interface ItemsTableProps {
  items: Record<string, unknown>[];
  columns: Column[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  onRowClick?: (item: Record<string, unknown>) => void;
}

const defaultColumns: Column[] = [
  { key: 'itemName', label: 'Name', render: (item) => (
    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0078D4' }}>
      {(item.itemName || item.appDisplayName || 'Unknown') as string}
    </Typography>
  )},
  { key: 'itemType', label: 'Type', render: (item) => ITEM_TYPE_LABELS[item.itemType as string] || item.itemType as string },
  { key: 'source', label: 'Source', render: (item) => SOURCE_LABELS[item.source as string] || item.source as string },
  { key: 'location', label: 'Location', render: (item) => (item.vaultName || item.appDisplayName || '-') as string },
  { key: 'expiresOn', label: 'Expires', render: (item) => formatDate(item.expiresOn as string | null) },
  { key: 'daysUntilExpiration', label: 'Time Left', render: (item) => formatDaysUntilExpiration(item.daysUntilExpiration as number | null) },
  { key: 'expirationStatus', label: 'Status', render: (item) => <StatusBadge status={item.expirationStatus as string} /> },
];

export function ItemsTable({
  items,
  columns = defaultColumns,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  onRowClick,
}: ItemsTableProps) {
  return (
    <Paper sx={{ overflow: 'hidden', borderRadius: '2px' }}>
      {/* Resource count bar */}
      <Box sx={{
        px: 1.5, py: 0.75, backgroundColor: '#FAF9F8', borderBottom: '1px solid #EDEBE9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>
          {total.toLocaleString()} resource{total !== 1 ? 's' : ''}
        </Typography>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key}>{col.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow
                key={(item.id as string) || index}
                hover
                onClick={() => onRowClick?.(item)}
                sx={onRowClick ? {
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#F3F2F1' },
                } : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {col.render ? col.render(item) : (item[col.key] as string) ?? '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {items.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                  <Typography sx={{ color: '#A19F9D', fontSize: '0.8125rem' }}>No items found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        rowsPerPage={pageSize}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        onRowsPerPageChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50, 100]}
        sx={{
          borderTop: '1px solid #EDEBE9',
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: '0.75rem', color: '#605E5C',
          },
          '& .MuiTablePagination-select': {
            fontSize: '0.75rem',
          },
        }}
      />
    </Paper>
  );
}

export { defaultColumns };
