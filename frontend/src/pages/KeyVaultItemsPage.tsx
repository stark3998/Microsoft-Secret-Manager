import { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Button, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/AddOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import VpnKeyIcon from '@mui/icons-material/VpnKeyOutlined';
import {
  useKeyVaultItems, useSubscriptions, useVaults,
  useCreateKeyVaultItem, useUpdateKeyVaultItem, useDeleteKeyVaultItem,
} from '../hooks/useItems';
import { useAuth } from '../auth/useAuth';
import { ItemFilters } from '../components/items/ItemFilters';
import { ItemsTable } from '../components/items/ItemsTable';
import { ExportToolbar } from '../components/items/ExportToolbar';
import { AcknowledgeActions } from '../components/items/AcknowledgeActions';
import { CredentialDetailDialog, KEYVAULT_FIELDS } from '../components/items/CredentialDetailDialog';
import { CreateCredentialDialog } from '../components/items/CreateCredentialDialog';
import { PageHeader } from '../components/common/PageHeader';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { SavedViewsBar } from '../components/common/SavedViewsBar';
import { useSavedViews } from '../hooks/useSavedViews';
import { formatDate, formatDaysUntilExpiration } from '../utils/formatters';
import { ITEM_TYPE_LABELS } from '../utils/constants';

const FIELD_MAP: Record<string, string> = {
  itemName: 'item_name', itemType: 'item_type', vaultName: 'vault_name',
  vaultUri: 'vault_uri', subscriptionId: 'subscription_id',
  subscriptionName: 'subscription_name', resourceGroup: 'resource_group',
  itemVersion: 'item_version', enabled: 'enabled', expiresOn: 'expires_on',
  notBeforeDate: 'not_before_date', tags: 'tags',
};

export function KeyVaultItemsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [subscription, setSubscription] = useState('');
  const [vault, setVault] = useState('');
  const [itemType, setItemType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const { data: subscriptions } = useSubscriptions();
  const { data: vaults } = useVaults(subscription || undefined);
  const { data, isLoading, refetch } = useKeyVaultItems({
    search: search || undefined,
    status: status || undefined,
    subscription: subscription || undefined,
    vault: vault || undefined,
    type: itemType || undefined,
    page,
    pageSize,
  });

  const createMut = useCreateKeyVaultItem();
  const updateMut = useUpdateKeyVaultItem();
  const deleteMut = useDeleteKeyVaultItem();

  const { views, saveView, deleteView } = useSavedViews('keyvault');

  const currentFilters: Record<string, string> = {};
  if (search) currentFilters.search = search;
  if (status) currentFilters.status = status;
  if (subscription) currentFilters.subscription = subscription;
  if (vault) currentFilters.vault = vault;
  if (itemType) currentFilters.itemType = itemType;

  const applyView = (filters: Record<string, string>) => {
    setSearch(filters.search || '');
    setStatus(filters.status || '');
    setSubscription(filters.subscription || '');
    setVault(filters.vault || '');
    setItemType(filters.itemType || '');
    setPage(1);
  };

  const exportFilters: Record<string, string> = {};
  if (status) exportFilters.status = status;
  if (subscription) exportFilters.subscriptionId = subscription;
  if (search) exportFilters.search = search;
  exportFilters.source = 'keyvault';

  const columns = [
    {
      key: 'itemName',
      label: 'Name',
      render: (item: Record<string, unknown>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VpnKeyIcon sx={{ fontSize: '1rem', color: '#0078D4' }} />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0078D4' }}>{item.itemName as string}</Typography>
        </Box>
      ),
    },
    {
      key: 'itemType',
      label: 'Type',
      render: (item: Record<string, unknown>) => ITEM_TYPE_LABELS[item.itemType as string] || (item.itemType as string),
    },
    { key: 'vaultName', label: 'Vault' },
    { key: 'subscriptionName', label: 'Subscription' },
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
    {
      key: 'actions',
      label: 'Actions',
      render: (item: Record<string, unknown>) => (
        <AcknowledgeActions
          itemId={item.id as string}
          partitionKey={item.partitionKey as string}
          acknowledged={item.acknowledged as boolean}
          snoozedUntil={item.snoozedUntil as string}
        />
      ),
    },
  ];

  const handleSave = (id: string, updates: Record<string, unknown>) => {
    const apiUpdates: Record<string, unknown> = {};
    for (const [camel, val] of Object.entries(updates)) {
      const snake = FIELD_MAP[camel] || camel;
      apiUpdates[snake] = val;
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
        title="Key Vault Items"
        description="Secrets, keys, and certificates across your Azure Key Vaults."
      />

      {/* Command bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
        px: 1.5, py: 0.75, backgroundColor: '#FFFFFF', border: '1px solid #EDEBE9', borderRadius: '2px',
        boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
      }}>
        {isAdmin && (
          <Button variant="text" startIcon={<AddIcon />} size="small" onClick={() => setCreateOpen(true)}>
            Add Item
          </Button>
        )}
        <Button variant="text" startIcon={<RefreshIcon />} size="small" onClick={() => refetch()}>
          Refresh
        </Button>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <ExportToolbar filters={exportFilters} />
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
        extraFilters={
          <>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel sx={{ fontSize: '0.8125rem' }}>Subscription</InputLabel>
              <Select value={subscription} label="Subscription" onChange={(e) => { setSubscription(e.target.value); setVault(''); setPage(1); }} sx={{ backgroundColor: '#FFFFFF', fontSize: '0.8125rem' }}>
                <MenuItem value="">All</MenuItem>
                {subscriptions?.map((s) => (
                  <MenuItem key={s.subscriptionId} value={s.subscriptionId}>{s.subscriptionName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ fontSize: '0.8125rem' }}>Vault</InputLabel>
              <Select value={vault} label="Vault" onChange={(e) => { setVault(e.target.value); setPage(1); }} sx={{ backgroundColor: '#FFFFFF', fontSize: '0.8125rem' }}>
                <MenuItem value="">All</MenuItem>
                {vaults?.map((v) => (
                  <MenuItem key={v.vaultName} value={v.vaultName}>{v.vaultName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ fontSize: '0.8125rem' }}>Type</InputLabel>
              <Select value={itemType} label="Type" onChange={(e) => { setItemType(e.target.value); setPage(1); }} sx={{ backgroundColor: '#FFFFFF', fontSize: '0.8125rem' }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="secret">Secret</MenuItem>
                <MenuItem value="key">Key</MenuItem>
                <MenuItem value="certificate">Certificate</MenuItem>
              </Select>
            </FormControl>
          </>
        }
      />

      {isLoading ? (
        <TableSkeleton columns={8} rows={10} />
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
        />
      )}

      <CredentialDetailDialog
        open={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        isAdmin={isAdmin}
        fields={KEYVAULT_FIELDS}
        title={selectedItem?.itemName as string || 'Key Vault Item'}
        saving={updateMut.isPending}
        deleting={deleteMut.isPending}
      />

      <CreateCredentialDialog
        open={createOpen}
        source="keyvault"
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        saving={createMut.isPending}
      />
    </Box>
  );
}
