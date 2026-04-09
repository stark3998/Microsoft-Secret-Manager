import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/AddOutlined';
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

  const { data, isLoading } = useAppRegistrations({
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
        <Typography variant="body2" fontWeight={500}>{item.appDisplayName as string}</Typography>
      ),
    },
    {
      key: 'itemType',
      label: 'Credential Type',
      render: (item: Record<string, unknown>) => ITEM_TYPE_LABELS[item.itemType as string] || (item.itemType as string),
    },
    { key: 'credentialDisplayName', label: 'Description' },
    { key: 'appId', label: 'Client ID' },
    {
      key: 'expiresOn',
      label: 'Expires',
      render: (item: Record<string, unknown>) => formatDate(item.expiresOn as string | null),
    },
    {
      key: 'daysUntilExpiration',
      label: 'Time Left',
      render: (item: Record<string, unknown>) => formatDaysUntilExpiration(item.daysUntilExpiration as number | null),
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
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3.5}>
        <Box>
          <Typography variant="h4">App Registrations</Typography>
          <Typography sx={{ color: '#6B7280', fontSize: '0.8125rem', mt: 0.5 }}>
            Client secrets and certificates for Entra ID app registrations.
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setCreateOpen(true)}>
            Add Credential
          </Button>
        )}
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
