import { Box, Skeleton, Paper, Grid } from '@mui/material';

export function DashboardSkeleton() {
  return (
    <Box>
      {/* Title */}
      <Skeleton width={200} height={32} sx={{ mb: 2 }} />

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Grid item xs={12} sm={6} md={2.4} key={i}>
            <Paper sx={{ p: 2 }}>
              <Skeleton width={80} height={14} sx={{ mb: 1 }} />
              <Skeleton width={60} height={32} sx={{ mb: 0.5 }} />
              <Skeleton width={100} height={12} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Chart area */}
      <Paper sx={{ p: 2, mb: 3, height: 300 }}>
        <Skeleton width={160} height={20} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} />
      </Paper>

      {/* Recent activity */}
      <Paper sx={{ p: 2 }}>
        <Skeleton width={140} height={20} sx={{ mb: 2 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={14} />
            </Box>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
