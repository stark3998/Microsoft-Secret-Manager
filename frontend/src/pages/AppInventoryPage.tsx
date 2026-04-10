import { useState } from 'react';
import {
  Box, Typography, Breadcrumbs, Link, Button,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell, TablePagination,
  Checkbox, Chip,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import Inventory2Icon from '@mui/icons-material/Inventory2Outlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import BlockIcon from '@mui/icons-material/BlockOutlined';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import { useAppInventory, useInventorySummary, useDisableApp, useEnableApp, useBulkDisable } from '../hooks/useAppInventory';
import { useAuth } from '../auth/useAuth';
import { InventorySummaryCards } from '../components/inventory/InventorySummaryCards';
import { ActivityBadge } from '../components/inventory/ActivityBadge';
import { AppDetailDialog } from '../components/inventory/AppDetailDialog';
import { DisableConfirmDialog } from '../components/inventory/DisableConfirmDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/formatters';
import type { AppInventoryRecord } from '../types';

export function AppInventoryPage() {
  const [search, setSearch] = useState('');
  const [classification, setClassification] = useState('');
  const [sortBy, setSortBy] = useState('signInCount30d');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedItem, setSelectedItem] = useState<AppInventoryRecord | null>(null);
  const [disableTarget, setDisableTarget] = useState<AppInventoryRecord | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const { data: summary, isLoading: summaryLoading } = useInventorySummary();
  const { data, isLoading, refetch } = useAppInventory({
    search: search || undefined,
    classification: classification || undefined,
    sortBy,
    sortOrder,
    page,
    pageSize,
  });

  const disableMut = useDisableApp();
  const enableMut = useEnableApp();
  const bulkDisableMut = useBulkDisable();

  const items = (data?.items || []) as AppInventoryRecord[];
  const total = data?.total || 0;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(items.map(i => i.appId)));
    } else {
      setSelected(new Set());
    }
  };

  const handleSelectOne = (appId: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(appId);
    else next.delete(appId);
    setSelected(next);
  };

  const handleDisableConfirm = () => {
    if (!disableTarget) return;
    disableMut.mutate(disableTarget.appId, {
      onSuccess: () => {
        setDisableTarget(null);
        setSelectedItem(null);
      },
    });
  };

  const handleEnable = (appId: string) => {
    enableMut.mutate(appId, {
      onSuccess: () => setSelectedItem(null),
    });
  };

  const handleBulkDisable = () => {
    bulkDisableMut.mutate(Array.from(selected), {
      onSuccess: () => setSelected(new Set()),
    });
  };

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1.5, '& .MuiBreadcrumbs-separator': { color: '#A19F9D' } }}>
        <Link underline="hover" color="#605E5C" href="/" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.8125rem' }}>
          <HomeIcon sx={{ fontSize: '0.875rem', mr: 0.5 }} />
          Home
        </Link>
        <Typography sx={{ fontSize: '0.8125rem', color: '#323130', fontWeight: 600 }}>App Inventory</Typography>
      </Breadcrumbs>

      <Box mb={2}>
        <Typography variant="h4">App Inventory</Typography>
        <Typography sx={{ color: '#605E5C', fontSize: '0.8125rem', mt: 0.5 }}>
          Monitor application activity, identify inactive apps, and manage lifecycle across your Entra ID tenant.
        </Typography>
      </Box>

      {/* Summary cards */}
      {!summaryLoading && summary && (
        <Box mb={2}>
          <InventorySummaryCards data={summary} />
        </Box>
      )}

      {/* Command bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
        px: 1.5, py: 0.75, backgroundColor: '#FFFFFF', border: '1px solid #EDEBE9', borderRadius: '2px',
        boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
      }}>
        <Button variant="text" startIcon={<RefreshIcon />} size="small" onClick={() => refetch()}>
          Refresh
        </Button>
        {isAdmin && selected.size > 0 && (
          <Button
            variant="text"
            startIcon={<BlockIcon />}
            size="small"
            color="error"
            onClick={handleBulkDisable}
            disabled={bulkDisableMut.isPending}
          >
            {bulkDisableMut.isPending ? 'Disabling...' : `Disable Selected (${selected.size})`}
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Box sx={{
        display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <TextField
          size="small"
          placeholder="Search by name or app ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: '1rem', color: '#A19F9D', mr: 0.5 }} /> }}
          sx={{ minWidth: 280 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Classification</InputLabel>
          <Select
            value={classification}
            label="Classification"
            onChange={(e) => { setClassification(e.target.value); setPage(1); }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="low_activity">Low Activity</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="zombie">Zombie</MenuItem>
            <MenuItem value="disabled">Disabled</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="signInCount30d">Sign-ins (30d)</MenuItem>
            <MenuItem value="appDisplayName">App Name</MenuItem>
            <MenuItem value="activityClassification">Classification</MenuItem>
            <MenuItem value="nearestExpiry">Nearest Expiry</MenuItem>
            <MenuItem value="lastSignInAt">Last Sign-in</MenuItem>
            <MenuItem value="uniqueUsers30d">Unique Users</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Order</InputLabel>
          <Select
            value={sortOrder}
            label="Order"
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <MenuItem value="asc">Asc</MenuItem>
            <MenuItem value="desc">Desc</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <Box sx={{
          backgroundColor: '#FFFFFF', border: '1px solid #EDEBE9', borderRadius: '2px',
          boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
        }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {isAdmin && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={items.length > 0 && selected.size === items.length}
                      indeterminate={selected.size > 0 && selected.size < items.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                )}
                <TableCell>Application</TableCell>
                <TableCell>Classification</TableCell>
                <TableCell align="right">Sign-ins (30d)</TableCell>
                <TableCell align="right">Users</TableCell>
                <TableCell>Credentials</TableCell>
                <TableCell>Last Sign-in</TableCell>
                <TableCell>Nearest Expiry</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSelectedItem(item)}
                >
                  {isAdmin && (
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={selected.has(item.appId)}
                        onChange={(e) => handleSelectOne(item.appId, e.target.checked)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Inventory2Icon sx={{ fontSize: '1rem', color: '#0078D4' }} />
                      <Box>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0078D4' }}>
                          {item.appDisplayName || 'Unknown'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.625rem', fontFamily: 'monospace', color: '#A19F9D' }}>
                          {item.appId}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <ActivityBadge classification={item.activityClassification} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      {item.signInCount30d.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: '0.8125rem' }}>
                      {item.uniqueUsers30d}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {(item.activeSecrets + item.activeCertificates) > 0 && (
                        <Chip
                          label={`${item.activeSecrets + item.activeCertificates} active`}
                          size="small"
                          sx={{ fontSize: '0.625rem', backgroundColor: '#DFF6DD', color: '#107C10', fontWeight: 600 }}
                        />
                      )}
                      {(item.expiredSecrets + item.expiredCertificates) > 0 && (
                        <Chip
                          label={`${item.expiredSecrets + item.expiredCertificates} expired`}
                          size="small"
                          sx={{ fontSize: '0.625rem', backgroundColor: '#FDE7E9', color: '#D13438', fontWeight: 600 }}
                        />
                      )}
                      {(item.totalSecrets + item.totalCertificates) === 0 && (
                        <Typography sx={{ fontSize: '0.75rem', color: '#A19F9D' }}>None</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#605E5C' }}>
                      {item.lastSignInAt ? formatDate(item.lastSignInAt) : 'Never'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#605E5C' }}>
                      {item.nearestExpiry ? formatDate(item.nearestExpiry) : '--'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography sx={{ color: '#605E5C', fontSize: '0.8125rem' }}>
                      No apps found. Run a scan to populate the inventory.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page - 1}
            rowsPerPage={pageSize}
            onPageChange={(_, p) => setPage(p + 1)}
            onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{
              borderTop: '1px solid #EDEBE9',
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.75rem' },
            }}
          />
        </Box>
      )}

      {/* Detail dialog */}
      <AppDetailDialog
        open={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onDisable={(appId) => {
          const target = items.find(i => i.appId === appId) || selectedItem;
          if (target) setDisableTarget(target);
        }}
        onEnable={handleEnable}
        isAdmin={isAdmin}
      />

      {/* Disable confirmation */}
      <DisableConfirmDialog
        open={!!disableTarget}
        appDisplayName={disableTarget?.appDisplayName || ''}
        appId={disableTarget?.appId || ''}
        classification={disableTarget?.activityClassification || ''}
        onConfirm={handleDisableConfirm}
        onCancel={() => setDisableTarget(null)}
        loading={disableMut.isPending}
      />
    </Box>
  );
}
