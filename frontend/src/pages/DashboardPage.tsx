import { Box, Grid } from '@mui/material';
import { useDashboardOverview, useTimeline } from '../hooks/useDashboard';
import { OverviewCards } from '../components/dashboard/OverviewCards';
import { ExpirationChart } from '../components/dashboard/ExpirationChart';
import { TimelineView } from '../components/dashboard/TimelineView';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { PageHeader } from '../components/common/PageHeader';
import { DashboardCustomizer } from '../components/dashboard/DashboardCustomizer';
import { DashboardSkeleton } from '../components/common/DashboardSkeleton';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export function DashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();
  const { data: timeline, isLoading: timelineLoading } = useTimeline();
  const { widgets, toggleWidget, moveWidget, resetLayout } = useDashboardLayout();

  if (overviewLoading) return <DashboardSkeleton />;

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        description="Monitor credentials, secrets, and certificates across your Azure environment."
        action={
          <DashboardCustomizer
            widgets={widgets}
            onToggle={toggleWidget}
            onMove={moveWidget}
            onReset={resetLayout}
          />
        }
      />

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
