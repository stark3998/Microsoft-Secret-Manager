import { Card, CardContent, Typography, Box, Button, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import { useLatestScan, useTriggerScan } from '../../hooks/useScans';
import { useAuth, authDisabledMode } from '../../auth/useAuth';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';

export function RecentActivity() {
  const { data: latestScan, isLoading } = useLatestScan();
  const triggerScan = useTriggerScan();
  const { user } = useAuth();

  return (
    <Card>
      <CardContent sx={{ py: 0, px: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{
          px: 2, py: 1.5, borderBottom: '1px solid #EDEBE9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon sx={{ fontSize: '1rem', color: '#0078D4' }} />
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#323130' }}>
              Last Scan
            </Typography>
          </Box>
          {user?.isAdmin && (
            <Box display="flex" alignItems="center" gap={0.75}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PlayArrowIcon sx={{ fontSize: '0.875rem !important' }} />}
                onClick={() => triggerScan.mutate(false)}
                disabled={triggerScan.isPending}
              >
                {triggerScan.isPending ? 'Starting...' : 'Scan Now'}
              </Button>
              {!authDisabledMode && (
                <Tooltip title="Scan using your Entra ID permissions instead of the service principal" arrow>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PersonIcon sx={{ fontSize: '0.875rem !important' }} />}
                    onClick={() => triggerScan.mutate(true)}
                    disabled={triggerScan.isPending}
                  >
                    Scan as Me
                  </Button>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ px: 2, py: 2 }}>
          {isLoading && (
            <Typography sx={{ color: '#A19F9D', fontSize: '0.8125rem' }}>Loading...</Typography>
          )}

          {latestScan && (
            <Box>
              <Box display="flex" gap={1} mb={1.5} alignItems="center">
                <Box sx={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: latestScan.status === 'completed' ? '#107C10' : latestScan.status === 'running' ? '#0078D4' : '#D13438',
                  boxShadow: latestScan.status === 'running' ? '0 0 0 3px rgba(0,120,212,0.2)' : 'none',
                }} />
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#323130', textTransform: 'capitalize' }}>
                  {latestScan.status}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#A19F9D' }}>
                  {formatRelativeTime(latestScan.startedAt)}
                </Typography>
              </Box>

              <Typography sx={{ fontSize: '0.75rem', color: '#605E5C', mb: 2 }}>
                {formatDateTime(latestScan.startedAt)}
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {[
                  { value: latestScan.itemsFound, label: 'Items found', color: '#323130' },
                  { value: latestScan.subscriptionsScanned, label: 'Subscriptions', color: '#323130' },
                  { value: latestScan.newExpiredFound, label: 'Newly expired', color: latestScan.newExpiredFound > 0 ? '#D13438' : '#323130' },
                  ...(latestScan.errors.length > 0 ? [{ value: latestScan.errors.length, label: 'Errors', color: '#D13438' }] : []),
                ].map((stat) => (
                  <Box key={stat.label} sx={{
                    p: 1.25, borderRadius: '2px', backgroundColor: '#FAF9F8',
                    border: '1px solid #EDEBE9',
                  }}>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, color: stat.color, lineHeight: 1.2 }}>
                      {stat.value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: '#A19F9D', mt: 0.25 }}>
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {!isLoading && !latestScan && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#A19F9D', fontSize: '0.8125rem' }}>
                No scans have been run yet
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
