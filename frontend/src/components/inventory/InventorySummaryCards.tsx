import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { ACTIVITY_COLORS } from '../../utils/constants';
import type { InventorySummary } from '../../types';

interface InventorySummaryCardsProps {
  data: InventorySummary;
}

function MetricTile({ title, value, color, accentTop }: { title: string; value: number; color: string; accentTop?: boolean }) {
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
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

export function InventorySummaryCards({ data }: InventorySummaryCardsProps) {
  const cards = [
    { title: 'Total Apps', value: data.total, color: '#323130', accentTop: false },
    { title: 'Active', value: data.active, color: ACTIVITY_COLORS.active, accentTop: true },
    { title: 'Low Activity', value: data.lowActivity, color: ACTIVITY_COLORS.low_activity, accentTop: true },
    { title: 'Inactive', value: data.inactive, color: ACTIVITY_COLORS.inactive, accentTop: true },
    { title: 'Zombie', value: data.zombie, color: ACTIVITY_COLORS.zombie, accentTop: true },
    { title: 'Disabled', value: data.disabled, color: ACTIVITY_COLORS.disabled, accentTop: true },
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
