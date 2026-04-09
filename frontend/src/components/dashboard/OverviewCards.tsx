import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { STATUS_COLORS } from '../../utils/constants';
import type { DashboardOverview } from '../../types';

interface OverviewCardsProps {
  data: DashboardOverview;
}

function MetricTile({ title, value, color, accentTop }: { title: string; value: number; color: string; accentTop?: boolean }) {
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      {/* Top accent bar */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        backgroundColor: accentTop ? color : 'transparent',
        borderRadius: '2px 2px 0 0',
      }} />
      <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
        <Typography sx={{
          fontSize: '0.75rem', fontWeight: 400, color: '#605E5C', mb: 0.75,
        }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography sx={{
            fontSize: '2rem', fontWeight: 600, color: value > 0 ? color : '#A19F9D',
            lineHeight: 1, letterSpacing: '-0.02em',
            fontFamily: '"Segoe UI", sans-serif',
          }}>
            {value.toLocaleString()}
          </Typography>
        </Box>
        {/* Severity bar */}
        <Box sx={{
          mt: 1.5, height: 4, borderRadius: 0, backgroundColor: '#F3F2F1', overflow: 'hidden',
        }}>
          <Box sx={{
            height: '100%', borderRadius: 0,
            backgroundColor: color,
            width: value > 0 ? '100%' : '0%',
            opacity: value > 0 ? 0.7 : 0,
            transition: 'width 0.3s ease',
          }} />
        </Box>
      </CardContent>
    </Card>
  );
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const { byStatus } = data;

  const cards = [
    { title: 'Total Items', value: data.total, color: '#323130', accentTop: false },
    { title: 'Expired', value: byStatus.expired || 0, color: STATUS_COLORS.expired, accentTop: true },
    { title: 'Critical', value: byStatus.critical || 0, color: STATUS_COLORS.critical, accentTop: true },
    { title: 'Warning', value: byStatus.warning || 0, color: STATUS_COLORS.warning, accentTop: true },
    { title: 'Notice', value: byStatus.notice || 0, color: STATUS_COLORS.notice, accentTop: true },
    { title: 'Healthy', value: byStatus.healthy || 0, color: STATUS_COLORS.healthy, accentTop: true },
  ];

  return (
    <Grid container spacing={1.5}>
      {cards.map((card) => (
        <Grid item xs={6} sm={4} md={2} key={card.title}>
          <MetricTile {...card} />
        </Grid>
      ))}
    </Grid>
  );
}
