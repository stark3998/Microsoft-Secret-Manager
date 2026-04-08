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
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Dashboard
      </Typography>

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
        <Grid item xs={12} md={8}>
          {timelineLoading ? (
            <LoadingSpinner />
          ) : (
            timeline && <TimelineView items={timeline.items} />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          <RecentActivity />
        </Grid>
      </Grid>
    </Box>
  );
}
