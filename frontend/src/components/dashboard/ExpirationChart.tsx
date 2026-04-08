import { Card, CardContent, Typography, Grid } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { STATUS_COLORS, SOURCE_LABELS, ITEM_TYPE_LABELS } from '../../utils/constants';
import type { DashboardOverview } from '../../types';

interface ExpirationChartProps {
  data: DashboardOverview;
}

export function ExpirationChart({ data }: ExpirationChartProps) {
  const statusData = Object.entries(data.byStatus).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
    color: STATUS_COLORS[key] || '#9e9e9e',
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
          <CardContent>
            <Typography variant="h6" gutterBottom>
              By Status
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              By Source
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              By Type
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} angle={-20} textAnchor="end" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4fc3f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
