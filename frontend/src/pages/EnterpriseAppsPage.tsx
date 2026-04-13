import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/AddOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import {
  useEnterpriseApps,
  useCreateEnterpriseApp, useUpdateEnterpriseApp, useDeleteEnterpriseApp,
} from '../hooks/useItems';
import { useAuth } from '../auth/useAuth';
import { ItemFilters } from '../components/items/ItemFilters';
import { ItemsTable } from '../components/items/ItemsTable';
import { CredentialDetailDialog, ENTERPRISE_APP_FIELDS } from '../components/items/CredentialDetailDialog';
import { CreateCredentialDialog } from '../components/items/CreateCredentialDialog';
import { PageHeader } from '../components/common/PageHeader';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { SavedViewsBar } from '../components/common/SavedViewsBar';
import { useSavedViews } from '../hooks/useSavedViews';
import { formatDate, formatDaysUntilExpiration } from '../utils/formatters';

const FIELD_MAP: Record<string, string> = {
  appDisplayName: 'app_display_name', servicePrincipalId: 'service_principal_id',
  appId: 'app_id', certType: 'cert_type', thumbprint: 'thumbprint',
  subject: 'subject', expiresOn: 'expires_on',
};

export function EnterpriseAppsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const { data, isLoading, refetch } = useEnterpriseApps({
    search: search || undefined,
    status: status || undefined,
    page,
    pageSize,
  });

  const createMut = useCreateEnterpriseApp();
  const updateMut = useUpdateEnterpriseApp();
  const deleteMut = useDeleteEnterpriseApp();

  const { views, saveView, deleteView } = useSavedViews('enterpriseApps');

  const currentFilters: Record<string, string> = {};
  if (search) currentFilters.search = search;
  if (status) currentFilters.status = status;

  const applyView = (filters: Record<string, string>) => {
    setSearch(filters.search || '');
    setStatus(filters.status || '');
    setPage(1);
  };

  const columns = [
    {
      key: 'appDisplayName',
      label: 'Application',
      render: (item: Record<string, unknown>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon sx={{ fontSize: '1rem', color: '#0078D4' }} />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0078D4' }}>{item.appDisplayName as string}</Typography>
        </Box>
      ),
    },
    { key: 'certType', label: 'Cert Type' },
    {
      key: 'thumbprint',
      label: 'Thumbprint',
      render: (item: Record<string, unknown>) => (
        <Typography sx={{ fontSize: '0.75rem', fontFamily: '"JetBrains Mono", "Fira Code", monospace', color: '#605E5C' }}>
          {item.thumbprint as string}
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
      <PageHeader
        title="Enterprise Apps"
        description="SAML signing and encryption certificates for enterprise applications."
      />

      {/* Command bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
        px: 1.5, py: 0.75, backgroundColor: '#FFFFFF', border: '1px solid #EDEBE9', borderRadius: '2px',
        boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
      }}>
        {isAdmin && (
          <Button variant="text" startIcon={<AddIcon />} size="small" onClick={() => setCreateOpen(true)}>
            Add Certificate
          </Button>
        )}
        <Button variant="text" startIcon={<RefreshIcon />} size="small" onClick={() => refetch()}>
          Refresh
        </Button>
      </Box>

      {views.length > 0 || Object.values(currentFilters).some(v => v) ? (
        <Box sx={{ mb: 1.5 }}>
          <SavedViewsBar
            views={views}
            currentFilters={currentFilters}
            onApplyView={applyView}
            onSaveView={saveView}
            onDeleteView={deleteView}
          />
        </Box>
      ) : null}

      <ItemFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
      />

      {isLoading ? (
        <TableSkeleton columns={6} rows={10} />
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
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkAcknowledge={() => { /* TODO: implement bulk acknowledge */ }}
          onBulkSnooze={() => { /* TODO: implement bulk snooze */ }}
          onBulkExport={() => { /* TODO: implement bulk export */ }}
          groupBy="appId"
          groupLabelField="appDisplayName"
        />
      )}

      <CredentialDetailDialog
        open={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        isAdmin={isAdmin}
        fields={ENTERPRISE_APP_FIELDS}
        title={selectedItem?.appDisplayName as string || 'Enterprise App'}
        saving={updateMut.isPending}
        deleting={deleteMut.isPending}
      />

      <CreateCredentialDialog
        open={createOpen}
        source="enterprise_app"
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        saving={createMut.isPending}
      />
    </Box>
  );
}
