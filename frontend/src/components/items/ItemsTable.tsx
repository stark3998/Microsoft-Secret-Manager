import { useState, useMemo, Fragment } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TablePagination, Typography, Box, Tooltip, IconButton, Checkbox, Chip,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNewOutlined';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import { BulkActionBar } from './BulkActionBar';
import { formatDate, formatDaysUntilExpiration, getExpirationColor } from '../../utils/formatters';
import { ITEM_TYPE_LABELS, SOURCE_LABELS } from '../../utils/constants';
import { getResourceLink } from '../../utils/azurePortalLinks';

const STATUS_ROW_COLORS: Record<string, string> = {
  expired: 'rgba(209, 52, 56, 0.06)',
  critical: 'rgba(216, 59, 1, 0.05)',
  warning: 'rgba(247, 99, 12, 0.04)',
  notice: 'rgba(0, 120, 212, 0.03)',
};

function getRowBackground(item: Record<string, unknown>): string | undefined {
  return STATUS_ROW_COLORS[item.expirationStatus as string];
}

const STATUS_PRIORITY: Record<string, number> = {
  expired: 0, critical: 1, warning: 2, notice: 3, healthy: 4, no_expiry: 5,
};

const GROUP_STATUS_BORDER: Record<string, string> = {
  expired: '#D13438',
  critical: '#D83B01',
  warning: '#F7630C',
  notice: '#0078D4',
  healthy: '#107C10',
  no_expiry: '#A19F9D',
};

function computeGroupSummary(groupItems: Record<string, unknown>[]) {
  let worstStatus = 'no_expiry';
  let worstPriority = 5;
  let nearestExpiry: string | null = null;
  let minDays: number | null = null;

  for (const item of groupItems) {
    const status = item.expirationStatus as string;
    const priority = STATUS_PRIORITY[status] ?? 5;
    if (priority < worstPriority) {
      worstPriority = priority;
      worstStatus = status;
    }
    const days = item.daysUntilExpiration as number | null;
    if (days !== null && days !== undefined && (minDays === null || days < minDays)) {
      minDays = days;
    }
    const exp = item.expiresOn as string | null;
    if (exp && (!nearestExpiry || exp < nearestExpiry)) {
      nearestExpiry = exp;
    }
  }

  return { worstStatus, nearestExpiry, minDays, count: groupItems.length };
}

interface Column {
  key: string;
  label: string;
  render?: (item: Record<string, unknown>) => React.ReactNode;
}

interface ItemsTableProps {
  items: Record<string, unknown>[];
  columns: Column[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  onRowClick?: (item: Record<string, unknown>) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onBulkAcknowledge?: () => void;
  onBulkSnooze?: () => void;
  onBulkExport?: () => void;
  groupBy?: string;
  groupLabelField?: string;
}

const defaultColumns: Column[] = [
  { key: 'itemName', label: 'Name', render: (item) => (
    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0078D4' }}>
      {(item.itemName || item.appDisplayName || 'Unknown') as string}
    </Typography>
  )},
  { key: 'itemType', label: 'Type', render: (item) => ITEM_TYPE_LABELS[item.itemType as string] || item.itemType as string },
  { key: 'source', label: 'Source', render: (item) => SOURCE_LABELS[item.source as string] || item.source as string },
  { key: 'location', label: 'Location', render: (item) => (item.vaultName || item.appDisplayName || '-') as string },
  { key: 'expiresOn', label: 'Expires', render: (item) => formatDate(item.expiresOn as string | null) },
  {
    key: 'daysUntilExpiration',
    label: 'Time Left',
    render: (item) => {
      const days = item.daysUntilExpiration as number | null;
      const text = formatDaysUntilExpiration(days);
      const color = getExpirationColor(days);
      return (
        <Typography
          component="span"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: color,
            backgroundColor: `${color}14`,
            px: 1,
            py: 0.25,
            borderRadius: '2px',
            display: 'inline-block',
          }}
        >
          {text}
        </Typography>
      );
    },
  },
  { key: 'expirationStatus', label: 'Status', render: (item) => <StatusBadge status={item.expirationStatus as string} /> },
  {
    key: 'actions',
    label: '',
    render: (item) => {
      const link = getResourceLink(item);
      return (
        <Box sx={{ display: 'flex', gap: 0.5, opacity: 0, transition: 'opacity 0.15s', '.MuiTableRow-root:hover &': { opacity: 1 } }}>
          {link && (
            <Tooltip title="Open in Azure Portal">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); window.open(link, '_blank', 'noopener'); }}
                sx={{ p: 0.5 }}
              >
                <OpenInNewIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      );
    },
  },
];

export function ItemsTable({
  items,
  columns = defaultColumns,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  onRowClick,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  onBulkAcknowledge,
  onBulkSnooze,
  onBulkExport,
  groupBy,
  groupLabelField,
}: ItemsTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, Record<string, unknown>[]>();
    for (const item of items) {
      const key = (item[groupBy] as string) || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items, groupBy]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const allGroupsExpanded = groups ? expandedGroups.size === groups.size : false;
  const toggleAllGroups = () => {
    if (!groups) return;
    setExpandedGroups(allGroupsExpanded ? new Set() : new Set(groups.keys()));
  };

  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id as string));
  const someSelected = items.some((item) => selectedIds.has(item.id as string)) && !allSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.map((item) => item.id as string)));
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  return (
    <Paper sx={{ overflow: 'hidden', borderRadius: '2px' }}>
      {/* Resource count bar */}
      <Box sx={{
        px: 1.5, py: 0.75, backgroundColor: '#FAF9F8', borderBottom: '1px solid #EDEBE9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>
          {total.toLocaleString()} resource{total !== 1 ? 's' : ''}
          {groups ? ` in ${groups.size} app${groups.size !== 1 ? 's' : ''}` : ''}
        </Typography>
        {groups && (
          <Tooltip title={allGroupsExpanded ? 'Collapse all' : 'Expand all'}>
            <IconButton size="small" onClick={toggleAllGroups} sx={{ p: 0.25 }}>
              {allGroupsExpanded ? (
                <UnfoldLessIcon sx={{ fontSize: '1rem', color: '#605E5C' }} />
              ) : (
                <UnfoldMoreIcon sx={{ fontSize: '1rem', color: '#605E5C' }} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    indeterminate={someSelected}
                    checked={allSelected}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell key={col.key}>{col.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {groups ? (
              Array.from(groups.entries()).map(([groupKey, groupItems]) => {
                const isExpanded = expandedGroups.has(groupKey);
                const summary = computeGroupSummary(groupItems);
                const labelField = groupLabelField || groupBy!;
                const label = (groupItems[0]?.[labelField] as string) || groupKey;
                const totalCols = columns.length + (selectable ? 1 : 0);

                return (
                  <Fragment key={groupKey}>
                    {/* Group header row */}
                    <TableRow
                      hover
                      onClick={() => toggleGroup(groupKey)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: '#FAF9F8',
                        borderLeft: `3px solid ${GROUP_STATUS_BORDER[summary.worstStatus] || '#A19F9D'}`,
                        '&:hover': { backgroundColor: '#F3F2F1' },
                      }}
                    >
                      <TableCell colSpan={totalCols} sx={{ py: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isExpanded
                            ? <KeyboardArrowDownIcon sx={{ fontSize: '1.25rem', color: '#605E5C' }} />
                            : <KeyboardArrowRightIcon sx={{ fontSize: '1.25rem', color: '#605E5C' }} />
                          }
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#323130' }}>
                            {label}
                          </Typography>
                          <Chip
                            label={`${summary.count} credential${summary.count !== 1 ? 's' : ''}`}
                            size="small"
                            sx={{ height: 20, fontSize: '0.6875rem', backgroundColor: '#E1DFDD', color: '#605E5C' }}
                          />
                          <Box sx={{ flex: 1 }} />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 1 }}>
                            {summary.nearestExpiry && (
                              <Typography sx={{ fontSize: '0.75rem', color: '#605E5C' }}>
                                {formatDate(summary.nearestExpiry)}
                              </Typography>
                            )}
                            {summary.minDays !== null && (
                              <Typography
                                component="span"
                                sx={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: getExpirationColor(summary.minDays),
                                  backgroundColor: `${getExpirationColor(summary.minDays)}14`,
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: '2px',
                                }}
                              >
                                {formatDaysUntilExpiration(summary.minDays)}
                              </Typography>
                            )}
                            <StatusBadge status={summary.worstStatus} />
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                    {/* Expanded child rows */}
                    {isExpanded && groupItems.map((item, idx) => (
                      <TableRow
                        key={(item.id as string) || idx}
                        hover
                        onClick={() => onRowClick?.(item)}
                        selected={selectable && selectedIds.has(item.id as string)}
                        sx={{
                          ...(onRowClick ? { cursor: 'pointer' } : {}),
                          backgroundColor: getRowBackground(item),
                          '&:hover': { backgroundColor: '#F3F2F1' },
                        }}
                      >
                        {selectable && (
                          <TableCell padding="checkbox" sx={{ pl: 4 }}>
                            <Checkbox
                              size="small"
                              checked={selectedIds.has(item.id as string)}
                              onChange={(e) => { e.stopPropagation(); handleSelectRow(item.id as string); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                        )}
                        {columns.map((col, colIdx) => (
                          <TableCell key={col.key} sx={colIdx === 0 ? { pl: 5 } : undefined}>
                            {col.render ? col.render(item) : (item[col.key] as string) ?? '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </Fragment>
                );
              })
            ) : (
              items.map((item, index) => (
                <TableRow
                  key={(item.id as string) || index}
                  hover
                  onClick={() => onRowClick?.(item)}
                  selected={selectable && selectedIds.has(item.id as string)}
                  sx={{
                    ...(onRowClick ? { cursor: 'pointer' } : {}),
                    backgroundColor: getRowBackground(item),
                    '&:hover': { backgroundColor: onRowClick ? '#F3F2F1' : undefined },
                  }}
                >
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedIds.has(item.id as string)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(item.id as string);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(item) : (item[col.key] as string) ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
            {items.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} sx={{ border: 0 }}>
                  <EmptyState
                    icon={<SearchOffIcon sx={{ fontSize: 32 }} />}
                    title="No items found"
                    description="No items match your current filters. Try adjusting your search or filter criteria."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        rowsPerPage={pageSize}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        onRowsPerPageChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50, 100]}
        sx={{
          borderTop: '1px solid #EDEBE9',
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: '0.75rem', color: '#605E5C',
          },
          '& .MuiTablePagination-select': {
            fontSize: '0.75rem',
          },
        }}
      />
      {selectable && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onAcknowledge={onBulkAcknowledge}
          onSnooze={onBulkSnooze}
          onExport={onBulkExport}
          onClearSelection={() => onSelectionChange?.(new Set())}
        />
      )}
    </Paper>
  );
}

export { defaultColumns };
