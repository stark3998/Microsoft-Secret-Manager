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
}

const defaultColumns: Column[] = [
  { key: 'itemName', label: 'Name', render: (item) => (
    <Typography variant="body2" fontWeight={500}>
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
}: ItemsTableProps) {
  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} sx={{ fontWeight: 600 }}>{col.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={(item.id as string) || index} hover>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {col.render ? col.render(item) : (item[col.key] as string) ?? '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {items.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No items found</Typography>
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
      />
    </Paper>
  );
}

export { defaultColumns };
