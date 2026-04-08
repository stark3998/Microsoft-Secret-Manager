import { Card, CardContent, Typography, Box, Chip, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useLatestScan, useTriggerScan } from '../../hooks/useScans';
import { useAuth } from '../../auth/useAuth';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';

export function RecentActivity() {
  const { data: latestScan, isLoading } = useLatestScan();
  const triggerScan = useTriggerScan();
  const { user } = useAuth();

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Last Scan</Typography>
          {user?.isAdmin && (
            <Button
              variant="contained"
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={() => triggerScan.mutate()}
              disabled={triggerScan.isPending}
            >
              {triggerScan.isPending ? 'Starting...' : 'Scan Now'}
            </Button>
          )}
        </Box>

        {isLoading && <Typography color="text.secondary">Loading...</Typography>}

        {latestScan && (
          <Box>
            <Box display="flex" gap={1} mb={1} flexWrap="wrap">
              <Chip
                label={latestScan.status}
                size="small"
                color={latestScan.status === 'completed' ? 'success' : latestScan.status === 'running' ? 'info' : 'error'}
              />
              <Chip label={latestScan.trigger} size="small" variant="outlined" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {formatDateTime(latestScan.startedAt)} ({formatRelativeTime(latestScan.startedAt)})
            </Typography>
            <Box display="flex" gap={3} mt={1}>
              <Typography variant="body2">
                <strong>{latestScan.itemsFound}</strong> items
              </Typography>
              <Typography variant="body2">
                <strong>{latestScan.subscriptionsScanned}</strong> subscriptions
              </Typography>
              <Typography variant="body2">
                <strong>{latestScan.newExpiredFound}</strong> newly expired
              </Typography>
            </Box>
            {latestScan.errors.length > 0 && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {latestScan.errors.length} error(s) during scan
              </Typography>
            )}
          </Box>
        )}

        {!isLoading && !latestScan && (
          <Typography color="text.secondary">No scans have been run yet</Typography>
        )}
      </CardContent>
    </Card>
  );
}
