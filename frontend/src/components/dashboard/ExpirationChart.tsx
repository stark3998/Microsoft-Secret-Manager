import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { STATUS_COLORS, SOURCE_LABELS, ITEM_TYPE_LABELS } from '../../utils/constants';
import type { DashboardOverview } from '../../types';

interface ExpirationChartProps {
  data: DashboardOverview;
}

const tooltipStyle = {
  fontSize: '0.75rem',
  borderRadius: 8,
  border: '1px solid #E5E7EB',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '8px 12px',
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase', mb: 2 }}>
      {children}
    </Typography>
  );
}

export function ExpirationChart({ data }: ExpirationChartProps) {
  const statusData = Object.entries(data.byStatus)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
      value,
      color: STATUS_COLORS[key] || '#9CA3AF',
    }));

  const sourceData = Object.entries(data.bySource).map(([key, value]) => ({
    name: SOURCE_LABELS[key] || key,
    count: value,
  }));

  const typeData = Object.entries(data.byType).map(([key, value]) => ({
    name: ITEM_TYPE_LABELS[key] || key,
    count: value,
  }));

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <SectionHeader>Status Distribution</SectionHeader>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <Box display="flex" flexWrap="wrap" gap={1.5} mt={1} justifyContent="center">
              {statusData.map((entry) => (
                <Box key={entry.name} display="flex" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
                  <Typography sx={{ fontSize: '0.6875rem', color: '#6B7280' }}>
                    {entry.name} ({entry.value})
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <SectionHeader>By Source</SectionHeader>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sourceData} barSize={28}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#111827" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <SectionHeader>By Type</SectionHeader>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeData} layout="vertical" barSize={20}>
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
