import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate, formatDaysUntilExpiration } from '../../utils/formatters';
import { SOURCE_LABELS, ITEM_TYPE_LABELS } from '../../utils/constants';
import type { TimelineItem } from '../../types';

interface TimelineViewProps {
  items: TimelineItem[];
}

export function TimelineView({ items }: TimelineViewProps) {
  const upcoming = items
    .filter((i) => i.daysUntilExpiration !== null)
    .slice(0, 20);

  return (
    <Card>
      <CardContent sx={{ py: 2.5, px: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase', mb: 2 }}>
          Upcoming Expirations
        </Typography>
        <TableContainer sx={{ borderRadius: 1, overflow: 'hidden' }}>
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
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#111827' }}>
                      {item.itemName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                      {ITEM_TYPE_LABELS[item.itemType] || item.itemType}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                      {SOURCE_LABELS[item.source] || item.source}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                      {item.vaultName || item.appDisplayName || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                      {formatDate(item.expiresOn)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#374151', fontWeight: 500 }}>
                      {formatDaysUntilExpiration(item.daysUntilExpiration)}
                    </Typography>
                  </TableCell>
                  <TableCell><StatusBadge status={item.expirationStatus} /></TableCell>
                </TableRow>
              ))}
              {upcoming.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography sx={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>
                      No items with expiration dates found
                    </Typography>
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
