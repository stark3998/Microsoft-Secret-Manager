import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { STATUS_COLORS, SOURCE_LABELS, ITEM_TYPE_LABELS } from '../../utils/constants';
import type { DashboardOverview } from '../../types';

interface ExpirationChartProps {
  data: DashboardOverview;
}

const tooltipStyle = {
  fontSize: '0.75rem',
  borderRadius: 2,
  border: '1px solid #EDEBE9',
  boxShadow: '0 3.2px 7.2px 0 rgba(0,0,0,.132)',
  padding: '6px 10px',
  fontFamily: '"Segoe UI", sans-serif',
};

function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#323130', mb: 2 }}>
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
      color: STATUS_COLORS[key] || '#8A8886',
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
    <Grid container spacing={1.5}>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <ChartTitle>Severity Distribution</ChartTitle>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={1}
                  strokeWidth={0}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <Box display="flex" flexWrap="wrap" gap={1.5} mt={0.5} justifyContent="center">
              {statusData.map((entry) => (
                <Box key={entry.name} display="flex" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 10, height: 3, borderRadius: 0, backgroundColor: entry.color }} />
                  <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C' }}>
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
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <ChartTitle>By Source</ChartTitle>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sourceData} barSize={32}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#605E5C' }}
                  axisLine={{ stroke: '#EDEBE9' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#A19F9D' }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,120,212,0.06)' }} />
                <Bar dataKey="count" fill="#0078D4" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <ChartTitle>By Type</ChartTitle>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={typeData} layout="vertical" barSize={18}>
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#A19F9D' }}
                  axisLine={{ stroke: '#EDEBE9' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#605E5C' }}
                  axisLine={false}
                  tickLine={false}
                  width={85}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,120,212,0.06)' }} />
                <Bar dataKey="count" fill="#004578" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
