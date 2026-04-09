import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, MenuItem, IconButton, Divider, Typography, Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type CredentialSource = 'keyvault' | 'app_registration' | 'enterprise_app';

interface CreateCredentialDialogProps {
  open: boolean;
  source: CredentialSource;
  onClose: () => void;
  onCreate: (data: Record<string, unknown>) => void;
  saving?: boolean;
}

const INITIAL_KEYVAULT = {
  item_name: '', item_type: 'secret', vault_name: '', vault_uri: '',
  subscription_id: '', subscription_name: '', resource_group: '', enabled: true,
  expires_on: '', tags: {},
};

const INITIAL_APP_REG = {
  app_display_name: '', item_type: 'client_secret', app_id: '',
  app_object_id: '', credential_display_name: '', expires_on: '',
  thumbprint: '', subject: '',
};

const INITIAL_ENTERPRISE = {
  app_display_name: '', service_principal_id: '', app_id: '',
  cert_type: 'signing', thumbprint: '', subject: '', expires_on: '',
};

const TITLES: Record<CredentialSource, string> = {
  keyvault: 'New Key Vault Item',
  app_registration: 'New App Registration Credential',
  enterprise_app: 'New Enterprise App Certificate',
};

export function CreateCredentialDialog({
  open, source, onClose, onCreate, saving,
}: CreateCredentialDialogProps) {
  const [form, setForm] = useState<Record<string, unknown>>(() => getInitial(source));

  function getInitial(s: CredentialSource) {
    if (s === 'keyvault') return { ...INITIAL_KEYVAULT };
    if (s === 'app_registration') return { ...INITIAL_APP_REG };
    return { ...INITIAL_ENTERPRISE };
  }

  const handleOpen = () => setForm(getInitial(source));

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value || null }));
  };

  const handleSubmit = () => {
    const data = { ...form };
    if (!data.expires_on) data.expires_on = null;
    onCreate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth TransitionProps={{ onEnter: handleOpen }}>
      <DialogTitle sx={{ px: 3, pt: 2.5, pb: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{TITLES[source]}</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mt: 0.25 }}>
            Fill in the required fields to create a new credential.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#9CA3AF', mt: -0.5 }}>
          <CloseIcon sx={{ fontSize: '1.1rem' }} />
        </IconButton>
      </DialogTitle>
      <Divider sx={{ mt: 2 }} />
      <DialogContent sx={{ px: 3, pt: 2.5 }}>
        <Grid container spacing={2}>
          {source === 'keyvault' && (
            <>
              <Grid item xs={12}>
                <TextField label="Name" fullWidth required size="small" value={form.item_name ?? ''} onChange={(e) => set('item_name', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Type" fullWidth select required size="small" value={form.item_type ?? 'secret'} onChange={(e) => set('item_type', e.target.value)}>
                  <MenuItem value="secret">Secret</MenuItem>
                  <MenuItem value="key">Key</MenuItem>
                  <MenuItem value="certificate">Certificate</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Vault Name" fullWidth required size="small" value={form.vault_name ?? ''} onChange={(e) => set('vault_name', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Subscription ID" fullWidth size="small" value={form.subscription_id ?? ''} onChange={(e) => set('subscription_id', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Subscription Name" fullWidth size="small" value={form.subscription_name ?? ''} onChange={(e) => set('subscription_name', e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Resource Group" fullWidth size="small" value={form.resource_group ?? ''} onChange={(e) => set('resource_group', e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Expires On" type="datetime-local" fullWidth size="small" InputLabelProps={{ shrink: true }}
                  value={(form.expires_on as string || '').slice(0, 16)}
                  onChange={(e) => set('expires_on', e.target.value ? e.target.value + ':00Z' : '')} />
              </Grid>
            </>
          )}

          {source === 'app_registration' && (
            <>
              <Grid item xs={12}>
                <TextField label="Application Name" fullWidth required size="small" value={form.app_display_name ?? ''} onChange={(e) => set('app_display_name', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Credential Type" fullWidth select required size="small" value={form.item_type ?? 'client_secret'} onChange={(e) => set('item_type', e.target.value)}>
                  <MenuItem value="client_secret">Client Secret</MenuItem>
                  <MenuItem value="certificate">Certificate</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Client ID" fullWidth size="small" value={form.app_id ?? ''} onChange={(e) => set('app_id', e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Description" fullWidth size="small" value={form.credential_display_name ?? ''} onChange={(e) => set('credential_display_name', e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Expires On" type="datetime-local" fullWidth size="small" InputLabelProps={{ shrink: true }}
                  value={(form.expires_on as string || '').slice(0, 16)}
                  onChange={(e) => set('expires_on', e.target.value ? e.target.value + ':00Z' : '')} />
              </Grid>
            </>
          )}

          {source === 'enterprise_app' && (
            <>
              <Grid item xs={12}>
                <TextField label="Application Name" fullWidth required size="small" value={form.app_display_name ?? ''} onChange={(e) => set('app_display_name', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Cert Type" fullWidth select required size="small" value={form.cert_type ?? 'signing'} onChange={(e) => set('cert_type', e.target.value)}>
                  <MenuItem value="signing">Signing</MenuItem>
                  <MenuItem value="encryption">Encryption</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField label="App ID" fullWidth size="small" value={form.app_id ?? ''} onChange={(e) => set('app_id', e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Service Principal ID" fullWidth size="small" value={form.service_principal_id ?? ''} onChange={(e) => set('service_principal_id', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Thumbprint" fullWidth size="small" value={form.thumbprint ?? ''} onChange={(e) => set('thumbprint', e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Subject" fullWidth size="small" value={form.subject ?? ''} onChange={(e) => set('subject', e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Expires On" type="datetime-local" fullWidth size="small" InputLabelProps={{ shrink: true }}
                  value={(form.expires_on as string || '').slice(0, 16)}
                  onChange={(e) => set('expires_on', e.target.value ? e.target.value + ':00Z' : '')} />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button size="small" onClick={onClose} sx={{ fontSize: '0.8125rem' }}>Cancel</Button>
        <Button variant="contained" size="small" onClick={handleSubmit} disabled={saving}
          sx={{ fontSize: '0.8125rem' }}>
          {saving ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
