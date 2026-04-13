import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Switch, FormControlLabel, IconButton,
  Tabs, Tab, Divider, Chip, Select, MenuItem, FormControl, InputLabel,
  Paper,
} from '@mui/material';
import { useToast } from '../components/common/ToastProvider';
import AddIcon from '@mui/icons-material/AddOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import CloudIcon from '@mui/icons-material/CloudOutlined';
import FolderIcon from '@mui/icons-material/FolderOutlined';
import StorageIcon from '@mui/icons-material/StorageOutlined';
import SecurityIcon from '@mui/icons-material/SecurityOutlined';
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useSettings, useUpdateThresholds, useUpdateNotifications, useUpdateSchedule, useAppConfig, useUpdateAppConfig } from '../hooks/useSettings';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { ThresholdTier } from '../types';

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

function SectionHeader({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
      <Box display="flex" gap={1.5} alignItems="flex-start">
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px',
          backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, mt: 0.25,
        }}>
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
            {title}
          </Typography>
          {description && (
            <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mt: 0.25, lineHeight: 1.4 }}>
              {description}
            </Typography>
          )}
        </Box>
      </Box>
      {action}
    </Box>
  );
}

function FieldGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2.5, '&:last-child': { mb: 0 } }}>
      {label && (
        <Typography sx={{
          fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF',
          letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1.25,
        }}>
          {label}
        </Typography>
      )}
      {children}
    </Box>
  );
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1, px: 1.5, py: 1.25,
      borderRadius: '8px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', mb: 2.5,
    }}>
      <InfoOutlinedIcon sx={{ fontSize: '0.9rem', color: '#9CA3AF', mt: 0.15 }} />
      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.5 }}>
        {children}
      </Typography>
    </Box>
  );
}

const cardSx = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  transition: 'box-shadow 0.15s ease',
  '&:hover': { boxShadow: '0 2px 8px 0 rgb(0 0 0 / 0.08)' },
};

const saveButtonSx = {
  backgroundColor: '#0078D4',
  color: '#fff',
  fontSize: '0.75rem',
  fontWeight: 500,
  px: 2,
  py: 0.75,
  borderRadius: '4px',
  '&:hover': { backgroundColor: '#106EBE' },
};

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: appConfig, isLoading: configLoading } = useAppConfig();
  const updateThresholds = useUpdateThresholds();
  const updateNotifications = useUpdateNotifications();
  const updateSchedule = useUpdateSchedule();
  const updateAppConfigMutation = useUpdateAppConfig();
  const toast = useToast();

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
  const [config, setConfig] = useState({
    azureTenantId: '',
    azureClientId: '',
    azureClientSecret: '',
    azureEnvironment: 'AzureCloud',
    managedIdentityClientId: '',
    msalClientId: '',
    cosmosEndpoint: '',
    cosmosDatabase: 'secret-manager',
    storageMode: 'cosmos',
    setupCompletedAt: '',
  });

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

  useEffect(() => {
    if (appConfig) {
      setConfig({
        azureTenantId: appConfig.azureTenantId || '',
        azureClientId: appConfig.azureClientId || '',
        azureClientSecret: appConfig.azureClientSecret || '',
        azureEnvironment: appConfig.azureEnvironment || 'AzureCloud',
        managedIdentityClientId: appConfig.managedIdentityClientId || '',
        msalClientId: appConfig.msalClientId || '',
        cosmosEndpoint: appConfig.cosmosEndpoint || '',
        cosmosDatabase: appConfig.cosmosDatabase || 'secret-manager',
        storageMode: appConfig.storageMode || 'cosmos',
        setupCompletedAt: appConfig.setupCompletedAt || '',
      });
    }
  }, [appConfig]);

  if (isLoading) return <LoadingSpinner />;

  const handleSaveThresholds = async () => {
    await updateThresholds.mutateAsync(tiers);
    toast.success('Thresholds saved');
  };

  const handleSaveNotifications = async () => {
    await updateNotifications.mutateAsync(notif);
    toast.success('Notification settings saved');
  };

  const handleSaveSchedule = async () => {
    await updateSchedule.mutateAsync(schedule);
    toast.success('Schedule saved');
  };

  const handleSaveAppConfig = async () => {
    const result = await updateAppConfigMutation.mutateAsync(config);
    toast.success(
      result.requiresRestart
        ? 'Configuration saved. Changes to storage require an application restart to take effect.'
        : 'Configuration saved',
    );
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
      {/* Page header */}
      <Box mb={3.5}>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.025em' }}>
          Settings
        </Typography>
        <Typography sx={{ color: '#9CA3AF', fontSize: '0.8125rem', mt: 0.5 }}>
          Manage thresholds, notifications, and environment configuration.
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{
        borderBottom: '1px solid #F3F4F6',
        mb: 0,
      }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 42,
            '& .MuiTabs-indicator': { height: 2, borderRadius: '2px 2px 0 0', backgroundColor: '#0078D4' },
            '& .MuiTab-root': {
              minHeight: 42, py: 1, px: 2, mr: 0.5,
              fontSize: '0.8125rem', fontWeight: 500, color: '#9CA3AF',
              '&.Mui-selected': { color: '#0078D4', fontWeight: 600 },
            },
          }}
        >
          <Tab label="Thresholds & Schedule" />
          <Tab label="Notifications" />
          <Tab label="Environment" />
        </Tabs>
      </Box>

      {/* ─── Tab 0: Thresholds & Schedule ─── */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader
                  icon={<WarningAmberIcon sx={{ fontSize: '1.1rem', color: '#6B7280' }} />}
                  title="Expiration Thresholds"
                  description="Define alert tiers based on days until expiration"
                  action={
                    <Button size="small" startIcon={<SaveIcon />} sx={saveButtonSx}
                      variant="contained" onClick={handleSaveThresholds}>
                      Save
                    </Button>
                  }
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {tiers.map((tier, i) => (
                    <Box key={i} sx={{
                      display: 'flex', gap: 1, alignItems: 'center',
                      p: 1.25, borderRadius: '8px', backgroundColor: '#F9FAFB',
                      border: '1px solid #F3F4F6',
                    }}>
                      <TextField
                        label="Name" value={tier.name} size="small" sx={{ flex: 1 }}
                        onChange={(e) => { const t = [...tiers]; t[i] = { ...t[i], name: e.target.value }; setTiers(t); }}
                      />
                      <TextField
                        label="Days" type="number" value={tier.daysBeforeExpiry} size="small" sx={{ width: 90 }}
                        onChange={(e) => { const t = [...tiers]; t[i] = { ...t[i], daysBeforeExpiry: parseInt(e.target.value) || 0 }; setTiers(t); }}
                      />
                      <Box sx={{
                        width: 36, height: 36, borderRadius: '8px', overflow: 'hidden',
                        border: '1px solid #E5E7EB', flexShrink: 0,
                      }}>
                        <input
                          type="color" value={tier.color}
                          onChange={(e) => { const t = [...tiers]; t[i] = { ...t[i], color: e.target.value }; setTiers(t); }}
                          style={{ width: '150%', height: '150%', border: 'none', padding: 0, margin: '-25%', cursor: 'pointer' }}
                        />
                      </Box>
                      <IconButton size="small" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                        sx={{ color: '#D1D5DB', '&:hover': { color: '#EF4444', backgroundColor: '#FEF2F2' } }}>
                        <DeleteIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
                <Button size="small" startIcon={<AddIcon />}
                  onClick={() => setTiers([...tiers, { name: '', daysBeforeExpiry: 0, color: '#9CA3AF' }])}
                  sx={{ mt: 1.5, fontSize: '0.75rem', color: '#6B7280', '&:hover': { backgroundColor: '#F9FAFB' } }}>
                  Add Tier
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader
                  icon={<ScheduleIcon sx={{ fontSize: '1.1rem', color: '#6B7280' }} />}
                  title="Scan Schedule"
                  description="Automated scan frequency for credential monitoring"
                  action={
                    <Button size="small" startIcon={<SaveIcon />} sx={saveButtonSx}
                      variant="contained" onClick={handleSaveSchedule}>
                      Save
                    </Button>
                  }
                />
                <Box sx={{
                  p: 2, borderRadius: '10px', backgroundColor: '#F9FAFB',
                  border: '1px solid #F3F4F6',
                }}>
                  <FormControlLabel
                    control={
                      <Switch size="small" checked={schedule.enabled}
                        onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })}
                      />
                    }
                    label={<Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>Enable scheduled scans</Typography>}
                    sx={{ mb: 2, ml: 0 }}
                  />
                  <TextField
                    label="Cron Expression" value={schedule.cronExpression}
                    onChange={(e) => setSchedule({ ...schedule, cronExpression: e.target.value })}
                    size="small" fullWidth
                    helperText="e.g., '0 6 * * *' = daily at 6:00 AM UTC"
                    InputProps={{
                      sx: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.8125rem' },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ─── Tab 1: Notifications ─── */}
      <TabPanel value={tab} index={1}>
        <Card sx={cardSx}>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader
              icon={<NotificationsIcon sx={{ fontSize: '1.1rem', color: '#6B7280' }} />}
              title="Notification Channels"
              description="Configure how and where alerts are delivered"
              action={
                <Button size="small" startIcon={<SaveIcon />} sx={saveButtonSx}
                  variant="contained" onClick={handleSaveNotifications}>
                  Save All
                </Button>
              }
            />

            <Grid container spacing={3}>
              {/* Email */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{
                  p: 2.5, borderRadius: '10px', border: '1px solid #F3F4F6',
                  backgroundColor: notif.emailEnabled ? '#FFFFFF' : '#F9FAFB',
                  transition: 'all 0.2s ease',
                }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>Email (Graph API)</Typography>
                    <Switch size="small" checked={notif.emailEnabled}
                      onChange={(e) => setNotif({ ...notif, emailEnabled: e.target.checked })} />
                  </Box>
                  <TextField label="From Address" value={notif.emailFrom}
                    onChange={(e) => setNotif({ ...notif, emailFrom: e.target.value })}
                    size="small" fullWidth sx={{ mb: 1.5 }} disabled={!notif.emailEnabled} />
                  <Box display="flex" gap={1} mb={1}>
                    <TextField label="Add recipient" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      size="small" sx={{ flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                      disabled={!notif.emailEnabled} />
                    <Button onClick={addEmail} variant="outlined" size="small" disabled={!notif.emailEnabled}>Add</Button>
                  </Box>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {notif.emailRecipients.map((email) => (
                      <Chip key={email} label={email} size="small"
                        onDelete={notif.emailEnabled ? () => setNotif({ ...notif, emailRecipients: notif.emailRecipients.filter((e) => e !== email) }) : undefined} />
                    ))}
                  </Box>
                </Paper>
              </Grid>

              {/* Teams */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{
                  p: 2.5, borderRadius: '10px', border: '1px solid #F3F4F6',
                  backgroundColor: notif.teamsEnabled ? '#FFFFFF' : '#F9FAFB',
                  transition: 'all 0.2s ease',
                }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>Microsoft Teams</Typography>
                    <Switch size="small" checked={notif.teamsEnabled}
                      onChange={(e) => setNotif({ ...notif, teamsEnabled: e.target.checked })} />
                  </Box>
                  <TextField label="Webhook URL" value={notif.teamsWebhookUrl}
                    onChange={(e) => setNotif({ ...notif, teamsWebhookUrl: e.target.value })}
                    size="small" fullWidth disabled={!notif.teamsEnabled} />
                </Paper>
              </Grid>

              {/* Slack */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{
                  p: 2.5, borderRadius: '10px', border: '1px solid #F3F4F6',
                  backgroundColor: notif.slackEnabled ? '#FFFFFF' : '#F9FAFB',
                  transition: 'all 0.2s ease',
                }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>Slack</Typography>
                    <Switch size="small" checked={notif.slackEnabled}
                      onChange={(e) => setNotif({ ...notif, slackEnabled: e.target.checked })} />
                  </Box>
                  <TextField label="Webhook URL" value={notif.slackWebhookUrl}
                    onChange={(e) => setNotif({ ...notif, slackWebhookUrl: e.target.value })}
                    size="small" fullWidth disabled={!notif.slackEnabled} />
                </Paper>
              </Grid>

              {/* Generic Webhook */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{
                  p: 2.5, borderRadius: '10px', border: '1px solid #F3F4F6',
                  backgroundColor: notif.webhookEnabled ? '#FFFFFF' : '#F9FAFB',
                  transition: 'all 0.2s ease',
                }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>Generic Webhook</Typography>
                    <Switch size="small" checked={notif.webhookEnabled}
                      onChange={(e) => setNotif({ ...notif, webhookEnabled: e.target.checked })} />
                  </Box>
                  <TextField label="Webhook URL" value={notif.genericWebhookUrl}
                    onChange={(e) => setNotif({ ...notif, genericWebhookUrl: e.target.value })}
                    size="small" fullWidth sx={{ mb: 1.5 }} disabled={!notif.webhookEnabled} />
                  <Typography sx={{ fontSize: '0.6875rem', color: '#9CA3AF', mb: 1 }}>Custom headers</Typography>
                  <Box display="flex" gap={1} mb={1}>
                    <TextField label="Header" value={newHeaderKey} onChange={(e) => setNewHeaderKey(e.target.value)}
                      size="small" sx={{ flex: 1 }} disabled={!notif.webhookEnabled} />
                    <TextField label="Value" value={newHeaderValue} onChange={(e) => setNewHeaderValue(e.target.value)}
                      size="small" sx={{ flex: 1 }} disabled={!notif.webhookEnabled} />
                    <Button onClick={addHeader} variant="outlined" size="small" disabled={!notif.webhookEnabled}>Add</Button>
                  </Box>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {Object.entries(notif.webhookHeaders).map(([k, v]) => (
                      <Chip key={k} label={`${k}: ${v}`} size="small"
                        onDelete={notif.webhookEnabled ? () => {
                          const h = { ...notif.webhookHeaders };
                          delete h[k];
                          setNotif({ ...notif, webhookHeaders: h });
                        } : undefined} />
                    ))}
                  </Box>
                </Paper>
              </Grid>

              {/* Digest Options */}
              <Grid item xs={12}>
                <Divider sx={{ borderColor: '#F3F4F6' }} />
              </Grid>
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{
                  p: 2.5, borderRadius: '10px', border: '1px solid #F3F4F6', backgroundColor: '#F9FAFB',
                }}>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', mb: 1.5 }}>Digest & Alerts</Typography>
                  <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
                    <FormControlLabel
                      control={<Switch size="small" checked={notif.dailyDigestEnabled}
                        onChange={(e) => setNotif({ ...notif, dailyDigestEnabled: e.target.checked })} />}
                      label={<Typography sx={{ fontSize: '0.8125rem' }}>Daily digest</Typography>}
                    />
                    <TextField label="Digest Time (UTC)" value={notif.dailyDigestTime}
                      onChange={(e) => setNotif({ ...notif, dailyDigestTime: e.target.value })}
                      size="small" sx={{ width: 140 }} />
                    <FormControlLabel
                      control={<Switch size="small" checked={notif.notifyOnStatusChange}
                        onChange={(e) => setNotif({ ...notif, notifyOnStatusChange: e.target.checked })} />}
                      label={<Typography sx={{ fontSize: '0.8125rem' }}>Notify on status change</Typography>}
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ─── Tab 2: Environment ─── */}
      <TabPanel value={tab} index={2}>
        {configLoading ? (
          <LoadingSpinner />
        ) : (
          <Box>
            {/* Single save button for the whole tab */}
            <Box display="flex" justifyContent="flex-end" mb={2.5}>
              <Button
                variant="contained" size="small" startIcon={<SaveIcon />}
                sx={saveButtonSx}
                onClick={handleSaveAppConfig}
                disabled={updateAppConfigMutation.isPending}
              >
                {updateAppConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </Box>

            <Grid container spacing={3}>
              {/* Azure / Entra ID */}
              <Grid item xs={12} lg={7}>
                <Card sx={cardSx}>
                  <CardContent sx={{ p: 3 }}>
                    <SectionHeader
                      icon={<SecurityIcon sx={{ fontSize: '1.1rem', color: '#6B7280' }} />}
                      title="Azure / Entra ID"
                      description="Identity and authentication configuration for scanning and API access"
                    />

                    <FieldGroup label="Primary credentials">
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField label="Tenant ID" value={config.azureTenantId}
                            onChange={(e) => setConfig({ ...config, azureTenantId: e.target.value })}
                            fullWidth size="small" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            InputProps={{ sx: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.78rem' } }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField label="Client ID" value={config.azureClientId}
                            onChange={(e) => setConfig({ ...config, azureClientId: e.target.value })}
                            fullWidth size="small" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            InputProps={{ sx: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.78rem' } }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField label="Client Secret" value={config.azureClientSecret}
                            onChange={(e) => setConfig({ ...config, azureClientSecret: e.target.value })}
                            fullWidth size="small" type="password"
                            helperText="Leave unchanged to keep existing" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Environment</InputLabel>
                            <Select value={config.azureEnvironment} label="Environment"
                              onChange={(e) => setConfig({ ...config, azureEnvironment: e.target.value })}>
                              <MenuItem value="AzureCloud">Azure Public Cloud</MenuItem>
                              <MenuItem value="AzureUSGovernment">Azure US Government</MenuItem>
                              <MenuItem value="AzureChinaCloud">Azure China (21Vianet)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </FieldGroup>

                    <Divider sx={{ borderColor: '#F3F4F6', my: 1 }} />

                    <FieldGroup label="Advanced">
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField label="Managed Identity Client ID" value={config.managedIdentityClientId}
                            onChange={(e) => setConfig({ ...config, managedIdentityClientId: e.target.value })}
                            fullWidth size="small"
                            helperText="Only for user-assigned managed identity"
                            InputProps={{ sx: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.78rem' } }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField label="MSAL Client ID" value={config.msalClientId}
                            onChange={(e) => setConfig({ ...config, msalClientId: e.target.value })}
                            fullWidth size="small"
                            helperText="Defaults to Client ID if empty"
                            InputProps={{ sx: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.78rem' } }}
                          />
                        </Grid>
                      </Grid>
                    </FieldGroup>
                  </CardContent>
                </Card>
              </Grid>

              {/* Storage / Cosmos DB */}
              <Grid item xs={12} lg={5}>
                <Card sx={cardSx}>
                  <CardContent sx={{ p: 3 }}>
                    <SectionHeader
                      icon={<StorageIcon sx={{ fontSize: '1.1rem', color: '#6B7280' }} />}
                      title="Storage"
                      description="Data persistence and database configuration"
                    />

                    <InfoBanner>
                      Changes to storage settings require an application restart to take effect.
                    </InfoBanner>

                    <FieldGroup>
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Storage Mode</InputLabel>
                        <Select value={config.storageMode} label="Storage Mode"
                          onChange={(e) => setConfig({ ...config, storageMode: e.target.value })}>
                          <MenuItem value="cosmos">
                            <Box display="flex" alignItems="center" gap={1}>
                              <CloudIcon sx={{ fontSize: '1rem', color: '#3B82F6' }} />
                              <span>Azure Cosmos DB</span>
                            </Box>
                          </MenuItem>
                          <MenuItem value="local">
                            <Box display="flex" alignItems="center" gap={1}>
                              <FolderIcon sx={{ fontSize: '1rem', color: '#6B7280' }} />
                              <span>Local JSON Files</span>
                            </Box>
                          </MenuItem>
                        </Select>
                      </FormControl>

                      {config.storageMode === 'cosmos' && (
                        <Box sx={{
                          p: 2, borderRadius: '10px', backgroundColor: '#F9FAFB',
                          border: '1px solid #F3F4F6',
                        }}>
                          <Typography sx={{
                            fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF',
                            letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1.5,
                          }}>
                            Cosmos DB Connection
                          </Typography>
                          <TextField label="Endpoint" value={config.cosmosEndpoint}
                            onChange={(e) => setConfig({ ...config, cosmosEndpoint: e.target.value })}
                            fullWidth size="small" sx={{ mb: 1.5 }}
                            InputProps={{ sx: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.78rem' } }}
                          />
                          <TextField label="Database Name" value={config.cosmosDatabase}
                            onChange={(e) => setConfig({ ...config, cosmosDatabase: e.target.value })}
                            fullWidth size="small"
                            InputProps={{ sx: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.78rem' } }}
                          />
                        </Box>
                      )}

                      {config.storageMode === 'local' && (
                        <Box sx={{
                          p: 2, borderRadius: '10px', backgroundColor: '#F9FAFB',
                          border: '1px solid #F3F4F6',
                        }}>
                          <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                            Data is stored as JSON files in the <code style={{ fontSize: '0.75rem', padding: '1px 5px', backgroundColor: '#F3F4F6', borderRadius: 3 }}>./data/</code> directory.
                          </Typography>
                        </Box>
                      )}
                    </FieldGroup>

                    {config.setupCompletedAt && (
                      <Box sx={{
                        mt: 2.5, pt: 2, borderTop: '1px solid #F3F4F6',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#D1D5DB' }}>
                          Initial setup completed
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}>
                          {new Date(config.setupCompletedAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </TabPanel>
    </Box>
  );
}
