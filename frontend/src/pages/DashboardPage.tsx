import { Box, Typography, Grid } from '@mui/material';
import { useDashboardOverview, useTimeline } from '../hooks/useDashboard';
import { OverviewCards } from '../components/dashboard/OverviewCards';
import { ExpirationChart } from '../components/dashboard/ExpirationChart';
import { TimelineView } from '../components/dashboard/TimelineView';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export function DashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();
  const { data: timeline, isLoading: timelineLoading } = useTimeline();

  if (overviewLoading) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <Box>
      <Box mb={3.5}>
        <Typography variant="h4">Dashboard</Typography>
        <Typography sx={{ color: '#6B7280', fontSize: '0.8125rem', mt: 0.5 }}>
          Overview of all tracked credentials and their expiration status.
        </Typography>
      </Box>

      {overview && (
        <Box mb={3}>
          <OverviewCards data={overview} />
        </Box>
      )}

      {overview && (
        <Box mb={3}>
          <ExpirationChart data={overview} />
        </Box>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          {timelineLoading ? (
            <LoadingSpinner />
          ) : (
            timeline && <TimelineView items={timeline.items} />
          )}
        </Grid>
        <Grid item xs={12} lg={4}>
          <RecentActivity />
        </Grid>
      </Grid>
    </Box>
  );
}
