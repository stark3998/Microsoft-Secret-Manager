import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { STATUS_COLORS } from '../../utils/constants';
import type { DashboardOverview } from '../../types';

interface OverviewCardsProps {
  data: DashboardOverview;
}

interface StatCardProps {
  title: string;
  value: number;
  color: string;
}

function StatCard({ title, value, color }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h3" sx={{ color, fontWeight: 700 }}>
          {value.toLocaleString()}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const { byStatus } = data;

  const cards = [
    { title: 'Total Items', value: data.total, color: '#1976d2' },
    { title: 'Expired', value: byStatus.expired || 0, color: STATUS_COLORS.expired },
    { title: 'Critical', value: byStatus.critical || 0, color: STATUS_COLORS.critical },
    { title: 'Warning', value: byStatus.warning || 0, color: STATUS_COLORS.warning },
    { title: 'Notice', value: byStatus.notice || 0, color: STATUS_COLORS.notice },
    { title: 'Healthy', value: byStatus.healthy || 0, color: STATUS_COLORS.healthy },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={2} key={card.title}>
          <StatCard {...card} />
        </Grid>
      ))}
    </Grid>
  );
}
