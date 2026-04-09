import { useState } from 'react';
import { Box, Typography, Button, Breadcrumbs, Link } from '@mui/material';
import AddIcon from '@mui/icons-material/AddOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import AppRegistrationIcon from '@mui/icons-material/AppRegistrationOutlined';
import {
  useAppRegistrations,
  useCreateAppRegistration, useUpdateAppRegistration, useDeleteAppRegistration,
} from '../hooks/useItems';
import { useAuth } from '../auth/useAuth';
import { ItemFilters } from '../components/items/ItemFilters';
import { ItemsTable } from '../components/items/ItemsTable';
import { CredentialDetailDialog, APP_REGISTRATION_FIELDS } from '../components/items/CredentialDetailDialog';
import { CreateCredentialDialog } from '../components/items/CreateCredentialDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate, formatDaysUntilExpiration } from '../utils/formatters';
import { ITEM_TYPE_LABELS } from '../utils/constants';

const FIELD_MAP: Record<string, string> = {
  appDisplayName: 'app_display_name', itemType: 'item_type',
  appObjectId: 'app_object_id', appId: 'app_id',
  credentialId: 'credential_id', credentialDisplayName: 'credential_display_name',
  expiresOn: 'expires_on', thumbprint: 'thumbprint', subject: 'subject',
};

export function AppRegistrationsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const { data, isLoading, refetch } = useAppRegistrations({
    search: search || undefined,
    status: status || undefined,
    page,
    pageSize,
  });

  const createMut = useCreateAppRegistration();
  const updateMut = useUpdateAppRegistration();
  const deleteMut = useDeleteAppRegistration();

  const columns = [
    {
      key: 'appDisplayName',
      label: 'Application',
      render: (item: Record<string, unknown>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AppRegistrationIcon sx={{ fontSize: '1rem', color: '#0078D4' }} />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0078D4' }}>{item.appDisplayName as string}</Typography>
        </Box>
      ),
    },
    {
      key: 'itemType',
      label: 'Credential Type',
      render: (item: Record<string, unknown>) => ITEM_TYPE_LABELS[item.itemType as string] || (item.itemType as string),
    },
    { key: 'credentialDisplayName', label: 'Description' },
    {
      key: 'appId',
      label: 'Client ID',
      render: (item: Record<string, unknown>) => (
        <Typography sx={{ fontSize: '0.75rem', fontFamily: '"JetBrains Mono", "Fira Code", monospace', color: '#605E5C' }}>
          {item.appId as string}
        </Typography>
      ),
    },
    {
      key: 'expiresOn',
      label: 'Expires',
      render: (item: Record<string, unknown>) => formatDate(item.expiresOn as string | null),
    },
    {
      key: 'daysUntilExpiration',
      label: 'Time Left',
      render: (item: Record<string, unknown>) => (
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#323130' }}>
          {formatDaysUntilExpiration(item.daysUntilExpiration as number | null)}
        </Typography>
      ),
    },
    {
      key: 'expirationStatus',
      label: 'Status',
      render: (item: Record<string, unknown>) => <StatusBadge status={item.expirationStatus as string} />,
    },
  ];

  const handleSave = (id: string, updates: Record<string, unknown>) => {
    const apiUpdates: Record<string, unknown> = {};
    for (const [camel, val] of Object.entries(updates)) {
      apiUpdates[FIELD_MAP[camel] || camel] = val;
    }
    updateMut.mutate({ id, body: apiUpdates }, {
      onSuccess: () => setSelectedItem(null),
    });
  };

  const handleDelete = (id: string) => {
    deleteMut.mutate(id, { onSuccess: () => setSelectedItem(null) });
  };

  const handleCreate = (data: Record<string, unknown>) => {
    createMut.mutate(data, { onSuccess: () => setCreateOpen(false) });
  };

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1.5, '& .MuiBreadcrumbs-separator': { color: '#A19F9D' } }}>
        <Link underline="hover" color="#605E5C" href="/" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.8125rem' }}>
          <HomeIcon sx={{ fontSize: '0.875rem', mr: 0.5 }} />
          Home
        </Link>
        <Typography sx={{ fontSize: '0.8125rem', color: '#323130', fontWeight: 600 }}>App Registrations</Typography>
      </Breadcrumbs>

      <Box mb={2}>
        <Typography variant="h4">App Registrations</Typography>
        <Typography sx={{ color: '#605E5C', fontSize: '0.8125rem', mt: 0.5 }}>
          Client secrets and certificates for Entra ID app registrations.
        </Typography>
      </Box>

      {/* Command bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
        px: 1.5, py: 0.75, backgroundColor: '#FFFFFF', border: '1px solid #EDEBE9', borderRadius: '2px',
        boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
      }}>
        {isAdmin && (
          <Button variant="text" startIcon={<AddIcon />} size="small" onClick={() => setCreateOpen(true)}>
            Add Credential
          </Button>
        )}
        <Button variant="text" startIcon={<RefreshIcon />} size="small" onClick={() => refetch()}>
          Refresh
        </Button>
      </Box>

      <ItemFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <ItemsTable
          items={(data?.items || []) as unknown as Record<string, unknown>[]}
          columns={columns}
          total={data?.total || 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          onRowClick={setSelectedItem}
        />
      )}

      <CredentialDetailDialog
        open={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        isAdmin={isAdmin}
        fields={APP_REGISTRATION_FIELDS}
        title={selectedItem?.appDisplayName as string || 'App Registration'}
        saving={updateMut.isPending}
        deleting={deleteMut.isPending}
      />

      <CreateCredentialDialog
        open={createOpen}
        source="app_registration"
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        saving={createMut.isPending}
      />
    </Box>
  );
}
