import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { STATUS_COLORS } from '../../utils/constants';
import type { DashboardOverview } from '../../types';

interface OverviewCardsProps {
  data: DashboardOverview;
}

function StatCard({ title, value, color, subtle }: { title: string; value: number; color: string; subtle?: boolean }) {
  return (
    <Card sx={{
      height: '100%',
      transition: 'all 0.2s ease',
      '&:hover': { borderColor: '#E5E7EB', transform: 'translateY(-1px)', boxShadow: '0 4px 12px 0 rgb(0 0 0 / 0.06)' },
    }}>
      <CardContent sx={{ py: 2.5, px: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase', mb: 1 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, color: subtle ? '#374151' : color, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {value.toLocaleString()}
        </Typography>
        <Box sx={{ mt: 1.5, height: 3, borderRadius: 2, backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
          <Box sx={{
            height: '100%', width: '100%', borderRadius: 2,
            backgroundColor: subtle ? '#D1D5DB' : color,
            opacity: 0.4,
            transition: 'opacity 0.2s ease',
          }} />
        </Box>
      </CardContent>
    </Card>
  );
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const { byStatus } = data;

  const cards = [
    { title: 'Total Items', value: data.total, color: '#374151', subtle: true },
    { title: 'Expired', value: byStatus.expired || 0, color: STATUS_COLORS.expired },
    { title: 'Critical', value: byStatus.critical || 0, color: STATUS_COLORS.critical },
    { title: 'Warning', value: byStatus.warning || 0, color: STATUS_COLORS.warning },
    { title: 'Notice', value: byStatus.notice || 0, color: STATUS_COLORS.notice },
    { title: 'Healthy', value: byStatus.healthy || 0, color: STATUS_COLORS.healthy },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card) => (
        <Grid item xs={6} sm={4} md={2} key={card.title}>
          <StatCard {...card} />
        </Grid>
      ))}
    </Grid>
  );
}
