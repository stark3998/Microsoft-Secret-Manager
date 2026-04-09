import { Card, CardContent, Typography, Box, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowOutlined';
import { useLatestScan, useTriggerScan } from '../../hooks/useScans';
import { useAuth } from '../../auth/useAuth';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';

export function RecentActivity() {
  const { data: latestScan, isLoading } = useLatestScan();
  const triggerScan = useTriggerScan();
  const { user } = useAuth();

  return (
    <Card>
      <CardContent sx={{ py: 2.5, px: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Last Scan
          </Typography>
          {user?.isAdmin && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PlayArrowIcon sx={{ fontSize: '1rem !important' }} />}
              onClick={() => triggerScan.mutate()}
              disabled={triggerScan.isPending}
              sx={{ fontSize: '0.75rem' }}
            >
              {triggerScan.isPending ? 'Starting...' : 'Scan Now'}
            </Button>
          )}
        </Box>

        {isLoading && (
          <Typography sx={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>Loading...</Typography>
        )}

        {latestScan && (
          <Box>
            <Box display="flex" gap={1} mb={2} alignItems="center">
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: latestScan.status === 'completed' ? '#059669' : latestScan.status === 'running' ? '#0284C7' : '#DC2626',
                boxShadow: latestScan.status === 'running' ? '0 0 0 3px rgba(2, 132, 199, 0.2)' : 'none',
              }} />
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                {latestScan.status}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                {formatRelativeTime(latestScan.startedAt)}
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 2 }}>
              {formatDateTime(latestScan.startedAt)}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {[
                { value: latestScan.itemsFound, label: 'Items found', color: '#111827' },
                { value: latestScan.subscriptionsScanned, label: 'Subscriptions', color: '#111827' },
                { value: latestScan.newExpiredFound, label: 'Newly expired', color: latestScan.newExpiredFound > 0 ? '#DC2626' : '#111827' },
                ...(latestScan.errors.length > 0 ? [{ value: latestScan.errors.length, label: 'Errors', color: '#DC2626' }] : []),
              ].map((stat) => (
                <Box key={stat.label} sx={{
                  p: 1.5, borderRadius: '8px', backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                }}>
                  <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: stat.color, lineHeight: 1.2 }}>
                    {stat.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.6875rem', color: '#9CA3AF', mt: 0.25 }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {!isLoading && !latestScan && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography sx={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>
              No scans have been run yet
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
