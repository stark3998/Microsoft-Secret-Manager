import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate, formatDaysUntilExpiration } from '../../utils/formatters';
import { SOURCE_LABELS, ITEM_TYPE_LABELS } from '../../utils/constants';
import type { TimelineItem } from '../../types';

interface TimelineViewProps {
  items: TimelineItem[];
}

export function TimelineView({ items }: TimelineViewProps) {
  // Show the next 20 items expiring soonest
  const upcoming = items
    .filter((i) => i.daysUntilExpiration !== null)
    .slice(0, 20);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upcoming Expirations
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Time Left</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {upcoming.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{item.itemName}</TableCell>
                  <TableCell>{ITEM_TYPE_LABELS[item.itemType] || item.itemType}</TableCell>
                  <TableCell>{SOURCE_LABELS[item.source] || item.source}</TableCell>
                  <TableCell>{item.vaultName || item.appDisplayName || '-'}</TableCell>
                  <TableCell>{formatDate(item.expiresOn)}</TableCell>
                  <TableCell>{formatDaysUntilExpiration(item.daysUntilExpiration)}</TableCell>
                  <TableCell><StatusBadge status={item.expirationStatus} /></TableCell>
                </TableRow>
              ))}
              {upcoming.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No items with expiration dates found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
