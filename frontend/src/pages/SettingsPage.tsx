import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Switch, FormControlLabel, IconButton, Chip, Alert, Snackbar,
  Tabs, Tab, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useSettings, useUpdateThresholds, useUpdateNotifications, useUpdateSchedule } from '../hooks/useSettings';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { ThresholdTier } from '../types';

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateThresholds = useUpdateThresholds();
  const updateNotifications = useUpdateNotifications();
  const updateSchedule = useUpdateSchedule();

  const [tab, setTab] = useState(0);
  const [tiers, setTiers] = useState<ThresholdTier[]>([]);
  const [notif, setNotif] = useState({
    emailEnabled: false,
    emailRecipients: [] as string[],
    emailFrom: '',
    teamsEnabled: false,
    teamsWebhookUrl: '',
    slackEnabled: false,
    slackWebhookUrl: '',
    webhookEnabled: false,
    genericWebhookUrl: '',
    webhookHeaders: {} as Record<string, string>,
    notifyOnStatusChange: true,
    dailyDigestEnabled: false,
    dailyDigestTime: '08:00',
  });
  const [schedule, setSchedule] = useState({
    cronExpression: '0 6 * * *',
    enabled: true,
  });
  const [newEmail, setNewEmail] = useState('');
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  useEffect(() => {
    if (settings) {
      setTiers(settings.thresholds?.tiers || []);
      const n = settings.notifications || {};
      setNotif({
        emailEnabled: n.emailEnabled || false,
        emailRecipients: n.emailRecipients || [],
        emailFrom: n.emailFrom || '',
        teamsEnabled: n.teamsEnabled || false,
        teamsWebhookUrl: n.teamsWebhookUrl || '',
        slackEnabled: n.slackEnabled || false,
        slackWebhookUrl: n.slackWebhookUrl || '',
        webhookEnabled: n.webhookEnabled || false,
        genericWebhookUrl: n.genericWebhookUrl || '',
        webhookHeaders: n.webhookHeaders || {},
        notifyOnStatusChange: n.notifyOnStatusChange ?? true,
        dailyDigestEnabled: n.dailyDigestEnabled || false,
        dailyDigestTime: n.dailyDigestTime || '08:00',
      });
      setSchedule({
        cronExpression: settings.schedule?.cronExpression || '0 6 * * *',
        enabled: settings.schedule?.enabled ?? true,
      });
    }
  }, [settings]);

  if (isLoading) return <LoadingSpinner />;

  const handleSaveThresholds = async () => {
    await updateThresholds.mutateAsync(tiers);
    setSnackbar({ open: true, message: 'Thresholds saved' });
  };

  const handleSaveNotifications = async () => {
    await updateNotifications.mutateAsync(notif);
    setSnackbar({ open: true, message: 'Notification settings saved' });
  };

  const handleSaveSchedule = async () => {
    await updateSchedule.mutateAsync(schedule);
    setSnackbar({ open: true, message: 'Schedule saved' });
  };

  const addEmail = () => {
    if (newEmail && !notif.emailRecipients.includes(newEmail)) {
      setNotif({ ...notif, emailRecipients: [...notif.emailRecipients, newEmail] });
      setNewEmail('');
    }
  };

  const addHeader = () => {
    if (newHeaderKey) {
      setNotif({
        ...notif,
        webhookHeaders: { ...notif.webhookHeaders, [newHeaderKey]: newHeaderValue },
      });
      setNewHeaderKey('');
      setNewHeaderValue('');
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Settings
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Thresholds & Schedule" />
        <Tab label="Notifications" />
      </Tabs>

      {/* Tab 0: Thresholds & Schedule */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Expiration Thresholds</Typography>
                  <Button size="small" startIcon={<SaveIcon />} variant="contained" onClick={handleSaveThresholds}>
                    Save
                  </Button>
                </Box>
                {tiers.map((tier, i) => (
                  <Box key={i} display="flex" gap={1} mb={1} alignItems="center">
                    <TextField
                      label="Name" value={tier.name} size="small" sx={{ flex: 1 }}
                      onChange={(e) => { const t = [...tiers]; t[i] = { ...t[i], name: e.target.value }; setTiers(t); }}
                    />
                    <TextField
                      label="Days" type="number" value={tier.daysBeforeExpiry} size="small" sx={{ width: 100 }}
                      onChange={(e) => { const t = [...tiers]; t[i] = { ...t[i], daysBeforeExpiry: parseInt(e.target.value) || 0 }; setTiers(t); }}
                    />
                    <TextField
                      label="Color" type="color" value={tier.color} size="small" sx={{ width: 80 }}
                      onChange={(e) => { const t = [...tiers]; t[i] = { ...t[i], color: e.target.value }; setTiers(t); }}
                    />
                    <IconButton size="small" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<AddIcon />}
                  onClick={() => setTiers([...tiers, { name: '', daysBeforeExpiry: 0, color: '#9e9e9e' }])}>
                  Add Tier
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Scan Schedule</Typography>
                  <Button size="small" startIcon={<SaveIcon />} variant="contained" onClick={handleSaveSchedule}>
                    Save
                  </Button>
                </Box>
                <FormControlLabel
                  control={<Switch checked={schedule.enabled} onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })} />}
                  label="Enable scheduled scans"
                />
                <TextField
                  label="Cron Expression" value={schedule.cronExpression}
                  onChange={(e) => setSchedule({ ...schedule, cronExpression: e.target.value })}
                  size="small" fullWidth sx={{ mt: 1 }}
                  helperText="e.g., '0 6 * * *' = daily at 6:00 AM UTC"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 1: Notifications */}
      <TabPanel value={tab} index={1}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Notification Channels</Typography>
              <Button size="small" startIcon={<SaveIcon />} variant="contained" onClick={handleSaveNotifications}>
                Save All
              </Button>
            </Box>

            <Grid container spacing={3}>
              {/* Email */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Email (Graph API)</Typography>
                <FormControlLabel
                  control={<Switch checked={notif.emailEnabled} onChange={(e) => setNotif({ ...notif, emailEnabled: e.target.checked })} />}
                  label="Enable email notifications"
                />
                <TextField label="From Address" value={notif.emailFrom}
                  onChange={(e) => setNotif({ ...notif, emailFrom: e.target.value })}
                  size="small" fullWidth sx={{ mt: 1, mb: 1 }} />
                <Box display="flex" gap={1} mb={1}>
                  <TextField label="Add recipient" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    size="small" sx={{ flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && addEmail()} />
                  <Button onClick={addEmail} variant="outlined" size="small">Add</Button>
                </Box>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {notif.emailRecipients.map((email) => (
                    <Chip key={email} label={email} size="small"
                      onDelete={() => setNotif({ ...notif, emailRecipients: notif.emailRecipients.filter((e) => e !== email) })} />
                  ))}
                </Box>
              </Grid>

              {/* Teams */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Microsoft Teams</Typography>
                <FormControlLabel
                  control={<Switch checked={notif.teamsEnabled} onChange={(e) => setNotif({ ...notif, teamsEnabled: e.target.checked })} />}
                  label="Enable Teams notifications"
                />
                <TextField label="Webhook URL" value={notif.teamsWebhookUrl}
                  onChange={(e) => setNotif({ ...notif, teamsWebhookUrl: e.target.value })}
                  size="small" fullWidth sx={{ mt: 1 }} />
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              {/* Slack */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Slack</Typography>
                <FormControlLabel
                  control={<Switch checked={notif.slackEnabled} onChange={(e) => setNotif({ ...notif, slackEnabled: e.target.checked })} />}
                  label="Enable Slack notifications"
                />
                <TextField label="Webhook URL" value={notif.slackWebhookUrl}
                  onChange={(e) => setNotif({ ...notif, slackWebhookUrl: e.target.value })}
                  size="small" fullWidth sx={{ mt: 1 }} />
              </Grid>

              {/* Generic Webhook */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Generic Webhook</Typography>
                <FormControlLabel
                  control={<Switch checked={notif.webhookEnabled} onChange={(e) => setNotif({ ...notif, webhookEnabled: e.target.checked })} />}
                  label="Enable generic webhook"
                />
                <TextField label="Webhook URL" value={notif.genericWebhookUrl}
                  onChange={(e) => setNotif({ ...notif, genericWebhookUrl: e.target.value })}
                  size="small" fullWidth sx={{ mt: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Custom headers (for auth tokens, API keys):
                </Typography>
                <Box display="flex" gap={1} mt={1}>
                  <TextField label="Header" value={newHeaderKey} onChange={(e) => setNewHeaderKey(e.target.value)}
                    size="small" sx={{ flex: 1 }} />
                  <TextField label="Value" value={newHeaderValue} onChange={(e) => setNewHeaderValue(e.target.value)}
                    size="small" sx={{ flex: 1 }} />
                  <Button onClick={addHeader} variant="outlined" size="small">Add</Button>
                </Box>
                <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
                  {Object.entries(notif.webhookHeaders).map(([k, v]) => (
                    <Chip key={k} label={`${k}: ${v}`} size="small"
                      onDelete={() => {
                        const h = { ...notif.webhookHeaders };
                        delete h[k];
                        setNotif({ ...notif, webhookHeaders: h });
                      }} />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              {/* Digest */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Digest Options</Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <FormControlLabel
                    control={<Switch checked={notif.dailyDigestEnabled} onChange={(e) => setNotif({ ...notif, dailyDigestEnabled: e.target.checked })} />}
                    label="Daily digest"
                  />
                  <TextField label="Digest Time (UTC)" value={notif.dailyDigestTime}
                    onChange={(e) => setNotif({ ...notif, dailyDigestTime: e.target.value })}
                    size="small" />
                  <FormControlLabel
                    control={<Switch checked={notif.notifyOnStatusChange} onChange={(e) => setNotif({ ...notif, notifyOnStatusChange: e.target.checked })} />}
                    label="Notify on status change"
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity="success" onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
