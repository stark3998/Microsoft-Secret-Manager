import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField,
  Stepper, Step, StepLabel, StepContent, Alert, CircularProgress,
  Paper, IconButton, Tooltip, Divider, Chip, MenuItem, Select,
  InputLabel, FormControl, Checkbox, FormControlLabel,
} from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FolderIcon from '@mui/icons-material/Folder';
import {
  validateCosmos,
  initializeApp,
  generateEnv,
  type InitializeRequest,
} from '../api/setup';

const COSMOS_EMULATOR_ENDPOINT = 'https://localhost:8081/';
const COSMOS_EMULATOR_KEY =
  'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';

type StorageMode = 'cosmos' | 'local';
type SaveTarget = 'apply' | 'envfile';

interface SetupWizardPageProps {
  onComplete: () => void;
}

export function SetupWizardPage({ onComplete }: SetupWizardPageProps) {
  const [activeStep, setActiveStep] = useState(0);

  // Step 0: Storage mode
  const [storageMode, setStorageMode] = useState<StorageMode>('cosmos');

  // Step 1: Cosmos DB (only for cosmos mode)
  const [useEmulator, setUseEmulator] = useState(false);
  const [cosmosEndpoint, setCosmosEndpoint] = useState('');
  const [cosmosKey, setCosmosKey] = useState('');
  const [cosmosDatabase, setCosmosDatabase] = useState('secret-manager');
  const [useManagedIdentity, setUseManagedIdentity] = useState(false);
  const [cosmosTestStatus, setCosmosTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cosmosTestMessage, setCosmosTestMessage] = useState('');

  // Step 2: Azure Identity
  const [azureTenantId, setAzureTenantId] = useState('');
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [azureEnvironment, setAzureEnvironment] = useState('AzureCloud');
  const [managedIdentityClientId, setManagedIdentityClientId] = useState('');
  const [msalClientId, setMsalClientId] = useState('');

  // Step 3: Review & Apply
  const [saveTarget, setSaveTarget] = useState<SaveTarget>('apply');
  const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [initMessage, setInitMessage] = useState('');
  const [envContent, setEnvContent] = useState('');

  // ── helpers ──

  const handleEmulatorToggle = (checked: boolean) => {
    setUseEmulator(checked);
    if (checked) {
      setCosmosEndpoint(COSMOS_EMULATOR_ENDPOINT);
      setCosmosKey(COSMOS_EMULATOR_KEY);
    } else {
      setCosmosEndpoint('');
      setCosmosKey('');
    }
  };

  const handleTestCosmos = async () => {
    setCosmosTestStatus('loading');
    try {
      const result = await validateCosmos({
        endpoint: cosmosEndpoint,
        key: useManagedIdentity ? undefined : cosmosKey,
        database: cosmosDatabase,
        use_managed_identity: useManagedIdentity,
      });
      if (result.success) {
        setCosmosTestStatus('success');
        setCosmosTestMessage(
          result.databases?.length
            ? `Connected. Existing databases: ${result.databases.join(', ')}`
            : 'Connected successfully.',
        );
      } else {
        setCosmosTestStatus('error');
        setCosmosTestMessage(result.message);
      }
    } catch (e: unknown) {
      setCosmosTestStatus('error');
      setCosmosTestMessage(e instanceof Error ? e.message : 'Connection test failed');
    }
  };

  const buildRequest = (): InitializeRequest => ({
    storage_mode: storageMode,
    cosmos_endpoint: storageMode === 'cosmos' ? cosmosEndpoint : '',
    cosmos_key: storageMode === 'cosmos' && !useManagedIdentity ? cosmosKey : '',
    cosmos_database: storageMode === 'cosmos' ? cosmosDatabase : 'secret-manager',
    cosmos_use_managed_identity: storageMode === 'cosmos' && useManagedIdentity,
    azure_tenant_id: azureTenantId,
    azure_client_id: azureClientId,
    azure_client_secret: azureClientSecret,
    azure_environment: azureEnvironment,
    managed_identity_client_id: managedIdentityClientId,
    msal_client_id: msalClientId || azureClientId,
  });

  const handleInitialize = async () => {
    setInitStatus('loading');
    try {
      await initializeApp(buildRequest());
      setInitStatus('success');
      setInitMessage('Application initialised successfully! Redirecting to sign-in...');
      setTimeout(() => onComplete(), 3000);
    } catch (e: unknown) {
      setInitStatus('error');
      setInitMessage(e instanceof Error ? e.message : 'Initialisation failed');
    }
  };

  const handleGenerateEnv = async () => {
    setInitStatus('loading');
    try {
      const result = await generateEnv(buildRequest());
      setEnvContent(result.content);
      setInitStatus('success');
      setInitMessage('Environment file generated.');
    } catch (e: unknown) {
      setInitStatus('error');
      setInitMessage(e instanceof Error ? e.message : 'Failed to generate .env');
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const downloadEnv = () => {
    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── validation ──
  const azureValid = azureTenantId && azureClientId;

  // Map activeStep to logical step when local mode skips Cosmos
  const goForward = () => setActiveStep((s) => s + 1);
  const goBack = () => setActiveStep((s) => s - 1);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#0a1929',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Box sx={{ maxWidth: 820, width: '100%' }}>
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1.5} mb={1}>
            <VpnKeyIcon sx={{ fontSize: 40, color: '#4fc3f7' }} />
            <Typography variant="h3" fontWeight={800} color="#fff">
              Secret Manager
            </Typography>
          </Box>
          <Typography variant="h6" color="rgba(255,255,255,0.6)">
            First-time Setup
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              {/* ──────────── Step 0: Storage Mode ──────────── */}
              <Step key="storage">
                <StepLabel>
                  <Typography fontWeight={600}>Choose How to Run</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Secret Manager can store data in Azure Cosmos DB or locally on this machine.
                  </Typography>

                  <Grid container spacing={2}>
                    {/* Cosmos DB */}
                    <Grid item xs={12} sm={6}>
                      <Paper
                        variant="outlined"
                        onClick={() => setStorageMode('cosmos')}
                        sx={{
                          p: 2.5, cursor: 'pointer', borderWidth: 2, transition: 'all 0.2s',
                          borderColor: storageMode === 'cosmos' ? 'primary.main' : 'divider',
                          backgroundColor: storageMode === 'cosmos' ? 'rgba(25,118,210,0.04)' : 'transparent',
                          '&:hover': { borderColor: 'primary.main' },
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <CloudIcon color={storageMode === 'cosmos' ? 'primary' : 'action'} />
                          <Typography fontWeight={600}>Azure Cosmos DB</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Store data in Azure Cosmos DB. Supports cloud and Cosmos DB Emulator.
                          Ideal for production, team, and multi-instance deployments.
                        </Typography>
                        <Box mt={1} display="flex" gap={0.5}>
                          <Chip label="Production" size="small" color="primary" variant="outlined" />
                          <Chip label="Emulator" size="small" variant="outlined" />
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Local */}
                    <Grid item xs={12} sm={6}>
                      <Paper
                        variant="outlined"
                        onClick={() => setStorageMode('local')}
                        sx={{
                          p: 2.5, cursor: 'pointer', borderWidth: 2, transition: 'all 0.2s',
                          borderColor: storageMode === 'local' ? 'primary.main' : 'divider',
                          backgroundColor: storageMode === 'local' ? 'rgba(25,118,210,0.04)' : 'transparent',
                          '&:hover': { borderColor: 'primary.main' },
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <FolderIcon color={storageMode === 'local' ? 'primary' : 'action'} />
                          <Typography fontWeight={600}>Run Locally</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Store data as JSON files on this machine. No cloud account or database
                          needed. Good for evaluation, development, and single-user use.
                        </Typography>
                        <Box mt={1}>
                          <Chip label="No cloud required" size="small" variant="outlined" />
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Box mt={3}>
                    <Button variant="contained" onClick={goForward}>Continue</Button>
                  </Box>
                </StepContent>
              </Step>

              {/* ──────────── Step 1: Cosmos DB (cosmos mode only) ──────────── */}
              {storageMode === 'cosmos' && (
                <Step key="cosmos">
                  <StepLabel>
                    <Typography fontWeight={600}>Configure Cosmos DB</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Connect to your Azure Cosmos DB account or the local emulator.
                    </Typography>

                    <FormControlLabel
                      control={
                        <Checkbox checked={useEmulator} onChange={(e) => handleEmulatorToggle(e.target.checked)} />
                      }
                      label={<Typography variant="body2">Use Cosmos DB Emulator (local development)</Typography>}
                      sx={{ mb: 2 }}
                    />

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          label="Cosmos DB Endpoint" value={cosmosEndpoint}
                          onChange={(e) => setCosmosEndpoint(e.target.value)} fullWidth size="small"
                          placeholder="https://your-account.documents.azure.com:443/"
                          helperText="The URI of your Cosmos DB account"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={useManagedIdentity}
                              onChange={(e) => setUseManagedIdentity(e.target.checked)}
                              disabled={useEmulator}
                            />
                          }
                          label={<Typography variant="body2">Authenticate with Managed Identity (no key)</Typography>}
                        />
                      </Grid>
                      {!useManagedIdentity && (
                        <Grid item xs={12}>
                          <TextField
                            label="Cosmos DB Key" value={cosmosKey}
                            onChange={(e) => setCosmosKey(e.target.value)} fullWidth size="small"
                            type="password" placeholder="Primary or secondary key"
                          />
                        </Grid>
                      )}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Database Name" value={cosmosDatabase}
                          onChange={(e) => setCosmosDatabase(e.target.value)} fullWidth size="small"
                          helperText="Will be created if it doesn't exist"
                        />
                      </Grid>
                    </Grid>

                    <Box mt={2} display="flex" alignItems="center" gap={2}>
                      <Button
                        variant="outlined" onClick={handleTestCosmos}
                        disabled={!(cosmosEndpoint && (useManagedIdentity || cosmosKey)) || cosmosTestStatus === 'loading'}
                        startIcon={
                          cosmosTestStatus === 'loading' ? <CircularProgress size={16} /> :
                          cosmosTestStatus === 'success' ? <CheckCircleIcon /> : <StorageIcon />
                        }
                        color={cosmosTestStatus === 'success' ? 'success' : cosmosTestStatus === 'error' ? 'error' : 'primary'}
                      >
                        {cosmosTestStatus === 'loading' ? 'Testing...' :
                         cosmosTestStatus === 'success' ? 'Connected' : 'Test Connection'}
                      </Button>
                      {cosmosTestMessage && (
                        <Typography variant="body2" color={cosmosTestStatus === 'success' ? 'success.main' : 'error.main'} sx={{ flex: 1 }}>
                          {cosmosTestMessage}
                        </Typography>
                      )}
                    </Box>

                    <Box mt={3} display="flex" gap={1}>
                      <Button onClick={goBack}>Back</Button>
                      <Button variant="contained" onClick={goForward}
                        disabled={!(cosmosEndpoint && (useManagedIdentity || cosmosKey))}>
                        Continue
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              )}

              {/* ──────────── Step 2: Azure / Entra ID ──────────── */}
              <Step key="azure">
                <StepLabel>
                  <Typography fontWeight={600}>Azure / Entra ID Configuration</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Configure the Azure identity used for scanning and authentication.
                    You need an App Registration in Entra ID.
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Tenant ID" value={azureTenantId} required
                        onChange={(e) => setAzureTenantId(e.target.value)} fullWidth size="small"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        helperText="Your Entra ID (Azure AD) tenant ID"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="App Registration Client ID" value={azureClientId} required
                        onChange={(e) => setAzureClientId(e.target.value)} fullWidth size="small"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        helperText="Application (client) ID of your app registration"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Client Secret" value={azureClientSecret}
                        onChange={(e) => setAzureClientSecret(e.target.value)} fullWidth size="small"
                        type="password" placeholder="For local dev — leave empty for managed identity"
                        helperText="Required for local development; not needed with managed identity"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Azure Environment</InputLabel>
                        <Select value={azureEnvironment} label="Azure Environment"
                          onChange={(e) => setAzureEnvironment(e.target.value)}>
                          <MenuItem value="AzureCloud">Azure Public Cloud</MenuItem>
                          <MenuItem value="AzureUSGovernment">Azure US Government</MenuItem>
                          <MenuItem value="AzureChinaCloud">Azure China (21Vianet)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}><Divider sx={{ my: 0.5 }} /></Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Advanced (optional)
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Managed Identity Client ID" value={managedIdentityClientId}
                        onChange={(e) => setManagedIdentityClientId(e.target.value)} fullWidth size="small"
                        placeholder="For user-assigned managed identity"
                        helperText="Only needed for user-assigned managed identity in Azure"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="MSAL Client ID (frontend override)" value={msalClientId}
                        onChange={(e) => setMsalClientId(e.target.value)} fullWidth size="small"
                        placeholder="Defaults to App Registration Client ID"
                        helperText="Override if frontend uses a different app registration"
                      />
                    </Grid>
                  </Grid>

                  <Box mt={3} display="flex" gap={1}>
                    <Button onClick={goBack}>Back</Button>
                    <Button variant="contained" onClick={goForward} disabled={!azureValid}>
                      Continue
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              {/* ──────────── Step 3: Review & Apply ──────────── */}
              <Step key="review">
                <StepLabel>
                  <Typography fontWeight={600}>Review & Apply</Typography>
                </StepLabel>
                <StepContent>
                  {/* Summary */}
                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Configuration Summary
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={5}><Typography variant="body2" color="text.secondary">Storage</Typography></Grid>
                      <Grid item xs={7}>
                        <Chip
                          size="small"
                          icon={storageMode === 'cosmos' ? <CloudIcon /> : <FolderIcon />}
                          label={storageMode === 'cosmos' ? 'Azure Cosmos DB' : 'Local JSON files'}
                          color={storageMode === 'cosmos' ? 'primary' : 'default'}
                        />
                      </Grid>

                      {storageMode === 'cosmos' && (
                        <>
                          <Grid item xs={5}><Typography variant="body2" color="text.secondary">Cosmos Endpoint</Typography></Grid>
                          <Grid item xs={7}>
                            <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                              {cosmosEndpoint.length > 45 ? cosmosEndpoint.slice(0, 45) + '...' : cosmosEndpoint}
                            </Typography>
                          </Grid>
                          <Grid item xs={5}><Typography variant="body2" color="text.secondary">Auth</Typography></Grid>
                          <Grid item xs={7}>
                            <Typography variant="body2">
                              {useEmulator ? 'Emulator' : useManagedIdentity ? 'Managed Identity' : 'Key'}
                            </Typography>
                          </Grid>
                          <Grid item xs={5}><Typography variant="body2" color="text.secondary">Database</Typography></Grid>
                          <Grid item xs={7}>
                            <Typography variant="body2" fontFamily="monospace">{cosmosDatabase}</Typography>
                          </Grid>
                        </>
                      )}

                      {storageMode === 'local' && (
                        <>
                          <Grid item xs={5}><Typography variant="body2" color="text.secondary">Data directory</Typography></Grid>
                          <Grid item xs={7}>
                            <Typography variant="body2" fontFamily="monospace">./data/</Typography>
                          </Grid>
                        </>
                      )}

                      <Grid item xs={12}><Divider sx={{ my: 0.5 }} /></Grid>

                      <Grid item xs={5}><Typography variant="body2" color="text.secondary">Tenant ID</Typography></Grid>
                      <Grid item xs={7}><Typography variant="body2" fontFamily="monospace" fontSize={12}>{azureTenantId}</Typography></Grid>

                      <Grid item xs={5}><Typography variant="body2" color="text.secondary">Client ID</Typography></Grid>
                      <Grid item xs={7}><Typography variant="body2" fontFamily="monospace" fontSize={12}>{azureClientId}</Typography></Grid>

                      <Grid item xs={5}><Typography variant="body2" color="text.secondary">Environment</Typography></Grid>
                      <Grid item xs={7}><Typography variant="body2">{azureEnvironment}</Typography></Grid>
                    </Grid>
                  </Paper>

                  {/* Choose action */}
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>
                    How would you like to apply this configuration?
                  </Typography>

                  <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} sm={6}>
                      <Paper
                        variant="outlined"
                        onClick={() => setSaveTarget('apply')}
                        sx={{
                          p: 2, cursor: 'pointer', borderWidth: 2, transition: 'all 0.15s',
                          borderColor: saveTarget === 'apply' ? 'primary.main' : 'divider',
                          '&:hover': { borderColor: 'primary.main' },
                        }}
                      >
                        <Typography fontWeight={600} variant="body2">Initialise Now</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Set up storage, seed defaults, and start the application immediately.
                          {storageMode === 'cosmos'
                            ? ' Config is saved in Cosmos DB.'
                            : ' Config is saved to local JSON files.'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper
                        variant="outlined"
                        onClick={() => setSaveTarget('envfile')}
                        sx={{
                          p: 2, cursor: 'pointer', borderWidth: 2, transition: 'all 0.15s',
                          borderColor: saveTarget === 'envfile' ? 'primary.main' : 'divider',
                          '&:hover': { borderColor: 'primary.main' },
                        }}
                      >
                        <Typography fontWeight={600} variant="body2">Generate .env File</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Download a pre-filled .env file. You save it and restart the app yourself.
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Apply action */}
                  {saveTarget === 'apply' ? (
                    <>
                      {storageMode === 'cosmos' && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <strong>Reminder:</strong> To reconnect on restart, set these environment variables:
                          <Box component="pre" sx={{ mt: 1, p: 1.5, backgroundColor: '#263238', color: '#e0e0e0', borderRadius: 1, fontSize: '0.8rem', overflow: 'auto' }}>
                            {`COSMOS_ENDPOINT=${cosmosEndpoint}\nCOSMOS_KEY=${useManagedIdentity ? '(managed identity)' : '***'}\nCOSMOS_DATABASE=${cosmosDatabase}`}
                          </Box>
                          All other settings are loaded from the database automatically.
                        </Alert>
                      )}
                      {storageMode === 'local' && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Data will be stored in <code>./data/</code>. Set <code>STORAGE_MODE=local</code> in
                          your environment so the app uses local storage on restart.
                        </Alert>
                      )}
                      <Button
                        variant="contained" size="large" fullWidth sx={{ py: 1.5 }}
                        onClick={handleInitialize}
                        disabled={initStatus === 'loading' || initStatus === 'success'}
                        color={initStatus === 'success' ? 'success' : 'primary'}
                        startIcon={
                          initStatus === 'loading' ? <CircularProgress size={20} color="inherit" /> :
                          initStatus === 'success' ? <CheckCircleIcon /> : <RocketLaunchIcon />
                        }
                      >
                        {initStatus === 'loading' ? 'Initialising...' :
                         initStatus === 'success' ? 'Setup Complete' : 'Initialise Application'}
                      </Button>
                    </>
                  ) : (
                    <>
                      {!envContent ? (
                        <Button
                          variant="contained" size="large" fullWidth sx={{ py: 1.5 }}
                          onClick={handleGenerateEnv}
                          disabled={initStatus === 'loading'}
                          startIcon={initStatus === 'loading' ? <CircularProgress size={20} color="inherit" /> : <ComputerIcon />}
                        >
                          {initStatus === 'loading' ? 'Generating...' : 'Generate .env File'}
                        </Button>
                      ) : (
                        <Box>
                          <Box display="flex" gap={1} mb={2}>
                            <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadEnv}>
                              Download .env
                            </Button>
                            <Tooltip title="Copy to clipboard">
                              <IconButton onClick={() => copyToClipboard(envContent)}>
                                <ContentCopyIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#263238', maxHeight: 350, overflow: 'auto' }}>
                            <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#e0e0e0', whiteSpace: 'pre-wrap', m: 0 }}>
                              {envContent}
                            </Typography>
                          </Paper>
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            Save as <code>.env</code> in the project root, then restart both backend and frontend.
                          </Alert>
                        </Box>
                      )}
                    </>
                  )}

                  {initStatus === 'error' && (
                    <Alert severity="error" sx={{ mt: 2 }}>{initMessage}</Alert>
                  )}
                  {initStatus === 'success' && saveTarget === 'apply' && (
                    <Alert severity="success" sx={{ mt: 2 }}>{initMessage}</Alert>
                  )}

                  <Box mt={2}>
                    <Button onClick={goBack} disabled={initStatus === 'loading'}>Back</Button>
                  </Box>
                </StepContent>
              </Step>
            </Stepper>
          </CardContent>
        </Card>

        <Typography variant="body2" color="rgba(255,255,255,0.3)" textAlign="center" mt={3}>
          MS Secret Manager &mdash; Azure + Entra ID Secrets Management
        </Typography>
      </Box>
    </Box>
  );
}
