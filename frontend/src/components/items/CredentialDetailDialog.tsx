import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, Typography, Box, IconButton, Divider,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate, formatDaysUntilExpiration } from '../../utils/formatters';
import { SOURCE_LABELS, ITEM_TYPE_LABELS } from '../../utils/constants';

interface FieldDef {
  key: string;
  label: string;
  editable?: boolean;
  type?: 'text' | 'date' | 'boolean';
}

interface CredentialDetailDialogProps {
  open: boolean;
  item: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (id: string, updates: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  fields: FieldDef[];
  title: string;
  saving?: boolean;
  deleting?: boolean;
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.8125rem', color: '#111827', wordBreak: 'break-all', lineHeight: 1.5 }}>
        {value || <span style={{ color: '#D1D5DB' }}>--</span>}
      </Typography>
    </Box>
  );
}

export function CredentialDetailDialog({
  open, item, onClose, onSave, onDelete, isAdmin, fields, title, saving, deleting,
}: CredentialDetailDialogProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
      setEditing(false);
      setConfirmDelete(false);
    }
  }, [item]);

  if (!item) return null;

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value || null }));
  };

  const handleSave = () => {
    const updates: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.editable && formData[f.key] !== item[f.key]) {
        updates[f.key] = formData[f.key];
      }
    }
    onSave(item.id as string, updates);
    setEditing(false);
  };

  const handleDelete = () => {
    onDelete(item.id as string);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ px: 3, pt: 2.5, pb: 0 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{title}</Typography>
            <Box display="flex" gap={1} mt={0.75} alignItems="center">
              <Typography sx={{
                fontSize: '0.6875rem', fontWeight: 500, color: '#6B7280',
                px: 0.75, py: 0.125, borderRadius: '4px', backgroundColor: '#F3F4F6',
              }}>
                {SOURCE_LABELS[item.source as string] || (item.source as string)}
              </Typography>
              <Typography sx={{
                fontSize: '0.6875rem', fontWeight: 500, color: '#3B82F6',
                px: 0.75, py: 0.125, borderRadius: '4px', backgroundColor: '#EFF6FF',
              }}>
                {ITEM_TYPE_LABELS[item.itemType as string] || (item.itemType as string)}
              </Typography>
              <StatusBadge status={item.expirationStatus as string} />
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#9CA3AF', mt: -0.5 }}>
            <CloseIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider sx={{ mt: 2 }} />

      <DialogContent sx={{ px: 3, pt: 2.5, pb: 2.5 }}>
        {confirmDelete && (
          <Alert severity="error" sx={{ mb: 2.5, fontSize: '0.8125rem' }}>
            Are you sure? This cannot be undone.
            <Box mt={1} display="flex" gap={1}>
              <Button size="small" variant="contained" color="error" onClick={handleDelete} disabled={deleting}
                sx={{ fontSize: '0.75rem' }}>
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
              <Button size="small" onClick={() => setConfirmDelete(false)} sx={{ fontSize: '0.75rem' }}>Cancel</Button>
            </Box>
          </Alert>
        )}

        {/* Summary strip */}
        <Box sx={{
          display: 'flex', gap: 4, p: 2.5, mb: 2.5,
          borderRadius: '6px', backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6',
        }}>
          <DetailField label="Expires" value={formatDate(item.expiresOn as string | null)} />
          <DetailField label="Time Left" value={formatDaysUntilExpiration(item.daysUntilExpiration as number | null)} />
          <DetailField label="Created" value={formatDate(item.createdOn as string | null)} />
          {item.lastScannedAt ? (
            <DetailField label="Last Scanned" value={formatDate(item.lastScannedAt as string | null)} />
          ) : null}
        </Box>

        <Grid container spacing={2}>
          {fields.map((f) => (
            <Grid item xs={12} sm={6} key={f.key}>
              {editing && f.editable ? (
                <TextField
                  label={f.label}
                  fullWidth
                  size="small"
                  type={f.type === 'date' ? 'datetime-local' : 'text'}
                  value={
                    f.type === 'date'
                      ? (formData[f.key] as string || '').slice(0, 16)
                      : (formData[f.key] as string) ?? ''
                  }
                  onChange={(e) => handleFieldChange(f.key, e.target.value)}
                  InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
                />
              ) : (
                <DetailField
                  label={f.label}
                  value={
                    f.type === 'date'
                      ? formatDate(item[f.key] as string | null)
                      : f.type === 'boolean'
                        ? (item[f.key] ? 'Yes' : 'No')
                        : typeof item[f.key] === 'object'
                          ? JSON.stringify(item[f.key])
                          : String(item[f.key] ?? '')
                  }
                />
              )}
            </Grid>
          ))}
        </Grid>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {isAdmin && !editing && (
          <>
            <Button
              startIcon={<DeleteIcon sx={{ fontSize: '1rem !important' }} />}
              color="error"
              size="small"
              onClick={() => setConfirmDelete(true)}
              disabled={confirmDelete}
              sx={{ fontSize: '0.8125rem' }}
            >
              Delete
            </Button>
            <Box flex={1} />
            <Button
              startIcon={<EditIcon sx={{ fontSize: '1rem !important' }} />}
              variant="outlined"
              size="small"
              onClick={() => setEditing(true)}
              sx={{ fontSize: '0.8125rem' }}
            >
              Edit
            </Button>
          </>
        )}
        {isAdmin && editing && (
          <>
            <Box flex={1} />
            <Button size="small" onClick={() => { setEditing(false); setFormData({ ...item }); }}
              sx={{ fontSize: '0.8125rem' }}>
              Cancel
            </Button>
            <Button variant="contained" size="small" onClick={handleSave} disabled={saving}
              sx={{ fontSize: '0.8125rem' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        )}
        {!isAdmin && (
          <>
            <Box flex={1} />
            <Button size="small" onClick={onClose}>Close</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export const KEYVAULT_FIELDS: FieldDef[] = [
  { key: 'itemName', label: 'Name', editable: true },
  { key: 'itemType', label: 'Type', editable: true },
  { key: 'vaultName', label: 'Vault', editable: true },
  { key: 'vaultUri', label: 'Vault URI', editable: true },
  { key: 'subscriptionId', label: 'Subscription ID' },
  { key: 'subscriptionName', label: 'Subscription Name', editable: true },
  { key: 'resourceGroup', label: 'Resource Group', editable: true },
  { key: 'itemVersion', label: 'Version' },
  { key: 'enabled', label: 'Enabled', type: 'boolean' },
  { key: 'expiresOn', label: 'Expires On', editable: true, type: 'date' },
  { key: 'notBeforeDate', label: 'Not Before', type: 'date' },
  { key: 'tags', label: 'Tags' },
];

export const APP_REGISTRATION_FIELDS: FieldDef[] = [
  { key: 'appDisplayName', label: 'Application Name', editable: true },
  { key: 'itemType', label: 'Credential Type', editable: true },
  { key: 'appId', label: 'Client ID', editable: true },
  { key: 'appObjectId', label: 'Object ID', editable: true },
  { key: 'credentialId', label: 'Credential ID' },
  { key: 'credentialDisplayName', label: 'Description', editable: true },
  { key: 'expiresOn', label: 'Expires On', editable: true, type: 'date' },
  { key: 'thumbprint', label: 'Thumbprint' },
  { key: 'subject', label: 'Subject' },
];

export const ENTERPRISE_APP_FIELDS: FieldDef[] = [
  { key: 'appDisplayName', label: 'Application Name', editable: true },
  { key: 'servicePrincipalId', label: 'Service Principal ID', editable: true },
  { key: 'appId', label: 'App ID', editable: true },
  { key: 'certType', label: 'Certificate Type', editable: true },
  { key: 'thumbprint', label: 'Thumbprint', editable: true },
  { key: 'subject', label: 'Subject', editable: true },
  { key: 'expiresOn', label: 'Expires On', editable: true, type: 'date' },
];
