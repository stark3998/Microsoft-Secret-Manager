import { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Alert,
  Stepper, Step, StepLabel, StepContent, Paper, IconButton, Tooltip,
  Snackbar, Divider, List, ListItem, ListItemIcon, ListItemText,
  TextField, InputAdornment,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import WebhookIcon from '@mui/icons-material/Webhook';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import TerminalIcon from '@mui/icons-material/Terminal';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VerifiedIcon from '@mui/icons-material/Verified';
import apiClient from '../api/client';

const EVENTGRID_PATH = '/api/webhooks/eventgrid';

const SUPPORTED_EVENTS = [
  { type: 'Microsoft.KeyVault.SecretNewVersionCreated', label: 'Secret New Version Created', category: 'Secret' },
  { type: 'Microsoft.KeyVault.SecretNearExpiry', label: 'Secret Near Expiry', category: 'Secret' },
  { type: 'Microsoft.KeyVault.SecretExpired', label: 'Secret Expired', category: 'Secret' },
  { type: 'Microsoft.KeyVault.KeyNewVersionCreated', label: 'Key New Version Created', category: 'Key' },
  { type: 'Microsoft.KeyVault.KeyNearExpiry', label: 'Key Near Expiry', category: 'Key' },
  { type: 'Microsoft.KeyVault.KeyExpired', label: 'Key Expired', category: 'Key' },
  { type: 'Microsoft.KeyVault.CertificateNewVersionCreated', label: 'Certificate New Version Created', category: 'Certificate' },
  { type: 'Microsoft.KeyVault.CertificateNearExpiry', label: 'Certificate Near Expiry', category: 'Certificate' },
  { type: 'Microsoft.KeyVault.CertificateExpired', label: 'Certificate Expired', category: 'Certificate' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Secret: '#7c4dff',
  Key: '#00bcd4',
  Certificate: '#ff9800',
};

export function EventGridConfigPage() {
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [activeStep, setActiveStep] = useState(0);

  const webhookUrl = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}${EVENTGRID_PATH}`;
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: `${label} copied to clipboard` });
  };

  const handleVerifyEndpoint = async () => {
    setVerifyStatus('loading');
    try {
      // Send a mock validation event to test the endpoint is reachable
      const response = await apiClient.post('/webhooks/eventgrid', [
        {
          id: 'test-validation',
          eventType: 'Microsoft.EventGrid.SubscriptionValidationEvent',
          subject: '',
          data: { validationCode: 'test-verification' },
          dataVersion: '1',
          metadataVersion: '1',
          eventTime: new Date().toISOString(),
          topic: '',
        },
      ]);
      if (response.data?.validationResponse === 'test-verification') {
        setVerifyStatus('success');
        setVerifyMessage('Webhook endpoint is reachable and responding correctly.');
      } else {
        setVerifyStatus('error');
        setVerifyMessage('Endpoint responded but validation handshake failed.');
      }
    } catch (e: unknown) {
      setVerifyStatus('error');
      const msg = e instanceof Error ? e.message : 'Could not reach webhook endpoint';
      setVerifyMessage(msg);
    }
  };

  const azureCliCommand = `# Create Event Grid system topic for your Key Vault
az eventgrid system-topic create \\
  --name "secretmgr-keyvault-events" \\
  --resource-group <YOUR_RESOURCE_GROUP> \\
  --source "/subscriptions/<SUB_ID>/resourceGroups/<RG>/providers/Microsoft.KeyVault/vaults/<VAULT_NAME>" \\
  --topic-type "Microsoft.KeyVault.vaults" \\
  --location <LOCATION>

# Create webhook subscription
az eventgrid system-topic event-subscription create \\
  --name "secretmgr-kv-webhook" \\
  --system-topic-name "secretmgr-keyvault-events" \\
  --resource-group <YOUR_RESOURCE_GROUP> \\
  --endpoint "${webhookUrl}" \\
  --endpoint-type webhook \\
  --included-event-types \\
    Microsoft.KeyVault.SecretNewVersionCreated \\
    Microsoft.KeyVault.SecretNearExpiry \\
    Microsoft.KeyVault.SecretExpired \\
    Microsoft.KeyVault.KeyNewVersionCreated \\
    Microsoft.KeyVault.KeyNearExpiry \\
    Microsoft.KeyVault.KeyExpired \\
    Microsoft.KeyVault.CertificateNewVersionCreated \\
    Microsoft.KeyVault.CertificateNearExpiry \\
    Microsoft.KeyVault.CertificateExpired`;

  const bicepSnippet = `module eventGrid 'modules/event-grid.bicep' = {
  name: 'eventgrid-deploy'
  params: {
    baseName: baseName
    location: location
    webhookUrl: '${webhookUrl}'
  }
}`;

  return (
    <Box>
      <Box mb={3.5}>
        <Typography variant="h4">Event Grid Configuration</Typography>
        <Typography sx={{ color: '#6B7280', fontSize: '0.8125rem', mt: 0.5 }}>
          Configure Azure Event Grid to receive real-time Key Vault notifications.
        </Typography>
      </Box>

      {/* Webhook URL Card */}
      <Card sx={{ mb: 3, border: '1px solid #E5E7EB' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={2}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WebhookIcon sx={{ fontSize: '1.15rem', color: '#3B82F6' }} />
            </Box>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Your Webhook Endpoint</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280', mb: 2 }}>
            This URL is auto-detected from your current browser location. Use this as the Event Grid subscription endpoint.
          </Typography>
          <TextField
            fullWidth
            value={webhookUrl}
            InputProps={{
              readOnly: true,
              sx: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.85rem', backgroundColor: '#F9FAFB' },
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Copy URL">
                    <IconButton onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}>
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          <Box display="flex" alignItems="center" gap={2} mt={2}>
            <Button
              variant="outlined"
              startIcon={verifyStatus === 'success' ? <CheckCircleIcon /> : <VerifiedIcon />}
              color={verifyStatus === 'success' ? 'success' : verifyStatus === 'error' ? 'error' : 'primary'}
              onClick={handleVerifyEndpoint}
              disabled={verifyStatus === 'loading'}
            >
              {verifyStatus === 'loading' ? 'Verifying...' : verifyStatus === 'success' ? 'Verified' : 'Verify Endpoint'}
            </Button>
            {verifyMessage && (
              <Typography
                variant="body2"
                color={verifyStatus === 'success' ? 'success.main' : 'error.main'}
              >
                {verifyMessage}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Left: Step-by-step guide */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Step-by-Step Setup Guide
              </Typography>

              <Stepper activeStep={activeStep} orientation="vertical">
                {/* Step 1: Prerequisites */}
                <Step>
                  <StepLabel
                    onClick={() => setActiveStep(0)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Typography fontWeight={600}>Prerequisites</Typography>
                  </StepLabel>
                  <StepContent>
                    <List dense>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="action" fontSize="small" /></ListItemIcon>
                        <ListItemText
                          primary="Azure subscription with Key Vault(s) deployed"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="action" fontSize="small" /></ListItemIcon>
                        <ListItemText
                          primary="Microsoft.EventGrid resource provider registered in your subscription"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="action" fontSize="small" /></ListItemIcon>
                        <ListItemText
                          primary="This application deployed and publicly accessible (the webhook URL must be reachable from Azure)"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="action" fontSize="small" /></ListItemIcon>
                        <ListItemText
                          primary={`Contributor or "EventGrid EventSubscription Contributor" role on the Key Vault resource`}
                        />
                      </ListItem>
                    </List>
                    <Alert severity="info" sx={{ mt: 1 }}>
                      To register the Event Grid provider, run:
                      <Box
                        component="code"
                        sx={{ display: 'block', mt: 1, p: 1, backgroundColor: '#1E293B', color: '#E5E7EB', borderRadius: 1, fontSize: '0.85rem' }}
                      >
                        az provider register --namespace Microsoft.EventGrid
                      </Box>
                    </Alert>
                    <Button variant="contained" size="small" onClick={() => setActiveStep(1)} sx={{ mt: 2 }}>
                      Next
                    </Button>
                  </StepContent>
                </Step>

                {/* Step 2: Navigate to Key Vault */}
                <Step>
                  <StepLabel
                    onClick={() => setActiveStep(1)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Typography fontWeight={600}>Navigate to Key Vault Events</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" mb={1}>
                      In the Azure Portal:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary='1. Go to your Key Vault resource'
                          secondary="Search for Key vaults in the portal search bar"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary='2. In the left menu, click "Events"'
                          secondary="Under the Monitoring section"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary='3. Click "+ Event Subscription"'
                          secondary="This opens the Create Event Subscription wizard"
                        />
                      </ListItem>
                    </List>
                    <Box display="flex" gap={1} mt={2}>
                      <Button size="small" onClick={() => setActiveStep(0)}>Back</Button>
                      <Button variant="contained" size="small" onClick={() => setActiveStep(2)}>Next</Button>
                    </Box>
                  </StepContent>
                </Step>

                {/* Step 3: Configure Event Subscription */}
                <Step>
                  <StepLabel
                    onClick={() => setActiveStep(2)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Typography fontWeight={600}>Configure Event Subscription</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" mb={1}>
                      Fill in the Event Subscription form with these values:
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Grid container spacing={1.5}>
                        <Grid item xs={4}><Typography variant="body2" fontWeight={600}>Name</Typography></Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2" fontFamily="monospace">secretmgr-kv-events</Typography>
                        </Grid>
                        <Grid item xs={4}><Typography variant="body2" fontWeight={600}>Event Schema</Typography></Grid>
                        <Grid item xs={8}><Typography variant="body2">Event Grid Schema</Typography></Grid>
                        <Grid item xs={4}><Typography variant="body2" fontWeight={600}>System Topic Name</Typography></Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2" fontFamily="monospace">secretmgr-keyvault-events</Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                    <Typography variant="body2" fontWeight={600} mb={1}>Filter to Event Types:</Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap" mb={2}>
                      {SUPPORTED_EVENTS.map((evt) => (
                        <Chip
                          key={evt.type}
                          label={evt.label}
                          size="small"
                          sx={{
                            backgroundColor: CATEGORY_COLORS[evt.category] + '20',
                            borderColor: CATEGORY_COLORS[evt.category],
                            border: '1px solid',
                            fontWeight: 500,
                          }}
                        />
                      ))}
                    </Box>
                    <Box display="flex" gap={1} mt={2}>
                      <Button size="small" onClick={() => setActiveStep(1)}>Back</Button>
                      <Button variant="contained" size="small" onClick={() => setActiveStep(3)}>Next</Button>
                    </Box>
                  </StepContent>
                </Step>

                {/* Step 4: Configure Endpoint */}
                <Step>
                  <StepLabel
                    onClick={() => setActiveStep(3)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Typography fontWeight={600}>Set Webhook Endpoint</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" mb={1}>
                      Under "Endpoint Details":
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary='1. Set Endpoint Type to "Web Hook"'
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary='2. Click "Select an endpoint"'
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="3. Paste the following webhook URL:"
                        />
                      </ListItem>
                    </List>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <TextField
                        fullWidth
                        value={webhookUrl}
                        size="small"
                        InputProps={{
                          readOnly: true,
                          sx: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.8rem', backgroundColor: '#F9FAFB' },
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Copy URL">
                                <IconButton size="small" onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}>
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Azure will send a validation request to this URL when creating the subscription.
                      The endpoint must be publicly reachable and respond to the handshake. Use the "Verify Endpoint"
                      button above to confirm it's working before proceeding.
                    </Alert>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary='4. Click "Confirm Selection"'
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary='5. Click "Create" to finalize the subscription'
                        />
                      </ListItem>
                    </List>
                    <Box display="flex" gap={1} mt={2}>
                      <Button size="small" onClick={() => setActiveStep(2)}>Back</Button>
                      <Button variant="contained" size="small" onClick={() => setActiveStep(4)}>Next</Button>
                    </Box>
                  </StepContent>
                </Step>

                {/* Step 5: Verify */}
                <Step>
                  <StepLabel
                    onClick={() => setActiveStep(4)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Typography fontWeight={600}>Verify & Test</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" mb={2}>
                      After creating the subscription, verify it's working:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="action" fontSize="small" /></ListItemIcon>
                        <ListItemText
                          primary="Check that the subscription status shows 'Active' in the Azure Portal"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="action" fontSize="small" /></ListItemIcon>
                        <ListItemText
                          primary="Create or update a test secret in your Key Vault"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="action" fontSize="small" /></ListItemIcon>
                        <ListItemText
                          primary="Check the Dashboard — the item should appear or update within seconds"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="action" fontSize="small" /></ListItemIcon>
                        <ListItemText
                          primary="If events aren't arriving, check the Event Grid metrics in Azure Portal for delivery failures"
                        />
                      </ListItem>
                    </List>
                    <Alert severity="success" sx={{ mt: 1 }}>
                      Once verified, Key Vault changes will be reflected in Secret Manager in near real-time, without waiting for scheduled scans.
                    </Alert>
                    <Box display="flex" gap={1} mt={2}>
                      <Button size="small" onClick={() => setActiveStep(3)}>Back</Button>
                    </Box>
                  </StepContent>
                </Step>
              </Stepper>
            </CardContent>
          </Card>

          {/* CLI / IaC Section */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TerminalIcon />
                <Typography variant="h6" fontWeight={600}>Automated Setup (CLI / IaC)</Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight={600} mb={1}>Azure CLI</Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, mb: 3, backgroundColor: '#1E293B', position: 'relative', overflow: 'auto' }}
              >
                <Tooltip title="Copy CLI commands">
                  <IconButton
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8, color: '#aaa' }}
                    onClick={() => copyToClipboard(azureCliCommand, 'CLI commands')}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Typography
                  component="pre"
                  sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#E5E7EB', whiteSpace: 'pre-wrap', m: 0 }}
                >
                  {azureCliCommand}
                </Typography>
              </Paper>

              <Typography variant="subtitle2" fontWeight={600} mb={1}>Bicep (Infrastructure as Code)</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                This project includes a Bicep module at <code>infra/modules/event-grid.bicep</code>. Reference it from your main deployment:
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, backgroundColor: '#1E293B', position: 'relative', overflow: 'auto' }}
              >
                <Tooltip title="Copy Bicep snippet">
                  <IconButton
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8, color: '#aaa' }}
                    onClick={() => copyToClipboard(bicepSnippet, 'Bicep snippet')}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Typography
                  component="pre"
                  sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#E5E7EB', whiteSpace: 'pre-wrap', m: 0 }}
                >
                  {bicepSnippet}
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Info panels */}
        <Grid item xs={12} md={5}>
          {/* Supported Events */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <NotificationsActiveIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>Supported Event Types</Typography>
              </Box>
              {(['Secret', 'Key', 'Certificate'] as const).map((category) => (
                <Box key={category} mb={2}>
                  <Chip
                    label={category}
                    size="small"
                    sx={{
                      mb: 1,
                      backgroundColor: CATEGORY_COLORS[category],
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  />
                  <List dense disablePadding>
                    {SUPPORTED_EVENTS.filter((e) => e.category === category).map((evt) => (
                      <ListItem key={evt.type} sx={{ py: 0.25 }}>
                        <ListItemText
                          primary={evt.label}
                          secondary={evt.type}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          secondaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace', fontSize: '0.7rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* How it works */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <InfoOutlinedIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>How It Works</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <StorageIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Key Vault emits events"
                    secondary="When secrets, keys, or certificates are created, updated, or approach expiration"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <WebhookIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Event Grid delivers to webhook"
                    secondary="Events are pushed to this application's webhook endpoint in near real-time"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <SecurityIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Secret Manager processes events"
                    secondary="The item is fetched from Key Vault, expiration is recomputed, and Cosmos DB is updated"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <NotificationsActiveIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Notifications triggered"
                    secondary="If the item status changed (e.g., became expired or critical), configured notification channels are alerted"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Retry Policy */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Event Grid Retry Policy
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                The Bicep template configures these retry settings:
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={1}>
                <Grid item xs={7}><Typography variant="body2">Max delivery attempts</Typography></Grid>
                <Grid item xs={5}><Typography variant="body2" fontWeight={600}>30</Typography></Grid>
                <Grid item xs={7}><Typography variant="body2">Event time-to-live</Typography></Grid>
                <Grid item xs={5}><Typography variant="body2" fontWeight={600}>1440 min (24 hrs)</Typography></Grid>
                <Grid item xs={7}><Typography variant="body2">Delivery schema</Typography></Grid>
                <Grid item xs={5}><Typography variant="body2" fontWeight={600}>Event Grid Schema</Typography></Grid>
              </Grid>
              <Alert severity="info" sx={{ mt: 2 }} icon={<InfoOutlinedIcon />}>
                If delivery fails, Event Grid uses exponential backoff. Events that can't be delivered within 24 hours are dropped.
                Scheduled scans serve as a safety net.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity="success" onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
