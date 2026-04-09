import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined';
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
      <CardContent sx={{ py: 0, px: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #EDEBE9', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon sx={{ fontSize: '1rem', color: '#0078D4' }} />
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#323130' }}>
            Upcoming Expirations
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#A19F9D', ml: 'auto' }}>
            {upcoming.length} items
          </Typography>
        </Box>
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
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0078D4' }}>
                      {item.itemName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#605E5C' }}>
                      {ITEM_TYPE_LABELS[item.itemType] || item.itemType}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#605E5C' }}>
                      {SOURCE_LABELS[item.source] || item.source}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#605E5C' }}>
                      {item.vaultName || item.appDisplayName || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#605E5C' }}>
                      {formatDate(item.expiresOn)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#323130', fontWeight: 600 }}>
                      {formatDaysUntilExpiration(item.daysUntilExpiration)}
                    </Typography>
                  </TableCell>
                  <TableCell><StatusBadge status={item.expirationStatus} /></TableCell>
                </TableRow>
              ))}
              {upcoming.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography sx={{ color: '#A19F9D', fontSize: '0.8125rem' }}>
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
