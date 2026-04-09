import { Box, Typography, Grid, Breadcrumbs, Link } from '@mui/material';
import HomeIcon from '@mui/icons-material/HomeOutlined';
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
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 1.5, '& .MuiBreadcrumbs-separator': { color: '#A19F9D' } }}>
        <Link underline="hover" color="#605E5C" href="/" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.8125rem' }}>
          <HomeIcon sx={{ fontSize: '0.875rem', mr: 0.5 }} />
          Home
        </Link>
        <Typography sx={{ fontSize: '0.8125rem', color: '#323130', fontWeight: 600 }}>Dashboard</Typography>
      </Breadcrumbs>

      {/* Page header */}
      <Box mb={2.5}>
        <Typography variant="h4">Dashboard</Typography>
        <Typography sx={{ color: '#605E5C', fontSize: '0.8125rem', mt: 0.5 }}>
          Monitor credentials, secrets, and certificates across your Azure environment.
        </Typography>
      </Box>

      {overview && (
        <Box mb={2}>
          <OverviewCards data={overview} />
        </Box>
      )}

      {overview && (
        <Box mb={2}>
          <ExpirationChart data={overview} />
        </Box>
      )}

      <Grid container spacing={1.5}>
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
