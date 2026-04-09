import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Tooltip,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  IconButton,
  Pagination,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import TerminalIcon from '@mui/icons-material/TerminalOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useScanHistory, useTriggerScan, useActiveScan } from '../hooks/useScans';
import { useScanStream } from '../hooks/useScanStream';
import { useAuth, authDisabledMode } from '../auth/useAuth';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';
import type { ScanLogEvent } from '../types';

const LOG_COLORS: Record<string, string> = {
  log: '#93C5FD',
  phase_start: '#60A5FA',
  phase_complete: '#34D399',
  progress: '#A5B4FC',
  error: '#F87171',
  complete: '#4ADE80',
  failed: '#F87171',
};

const LOG_PREFIXES: Record<string, string> = {
  log: 'INFO',
  phase_start: '>>>>',
  phase_complete: ' OK ',
  progress: '  . ',
  error: 'ERR!',
  complete: 'DONE',
  failed: 'FAIL',
};

function formatLogTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

function LogLine({ event }: { event: ScanLogEvent }) {
  const color = LOG_COLORS[event.type] || '#D1D5DB';
  const prefix = LOG_PREFIXES[event.type] || 'INFO';

  return (
    <Box sx={{ display: 'flex', gap: 1.5, fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace', fontSize: '0.8125rem', lineHeight: 1.7 }}>
      <Box component="span" sx={{ color: '#6B7280', flexShrink: 0, userSelect: 'none' }}>
        {formatLogTime(event.timestamp)}
      </Box>
      <Box component="span" sx={{ color, fontWeight: 600, flexShrink: 0, width: 36, textAlign: 'center', userSelect: 'none' }}>
        {prefix}
      </Box>
      <Box component="span" sx={{ color, wordBreak: 'break-word' }}>
        {event.message}
      </Box>
    </Box>
  );
}

function ScanLogPanel({ scanId }: { scanId: string | null }) {
  const { logs, isConnected, isComplete } = useScanStream(scanId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  }, []);

  if (!scanId) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {/* Header bar */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.5, borderBottom: '1px solid #1F2937', backgroundColor: '#0F172A', borderRadius: '8px 8px 0 0',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TerminalIcon sx={{ fontSize: '1rem', color: '#6B7280' }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Scan Log
            </Typography>
            {isConnected && !isComplete && (
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4ADE80', ml: 0.5,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
              }} />
            )}
            {isComplete && (
              <Chip label="Complete" size="small" sx={{ height: 20, fontSize: '0.625rem', backgroundColor: '#065F46', color: '#6EE7B7', ml: 0.5 }} />
            )}
          </Box>
          <Typography sx={{ fontSize: '0.6875rem', color: '#4B5563' }}>
            {logs.length} events
          </Typography>
        </Box>

        {/* Log output area */}
        <Box
          ref={scrollRef}
          onScroll={handleScroll}
          sx={{
            backgroundColor: '#111827',
            px: 2.5,
            py: 2,
            maxHeight: 400,
            minHeight: 120,
            overflowY: 'auto',
            borderRadius: '0 0 8px 8px',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-track': { background: '#1F2937' },
            '&::-webkit-scrollbar-thumb': { background: '#374151', borderRadius: 3 },
          }}
        >
          {logs.length === 0 && (
            <Typography sx={{ color: '#4B5563', fontSize: '0.8125rem', fontFamily: 'monospace' }}>
              Waiting for scan events...
            </Typography>
          )}
          {logs.map((event, i) => (
            <LogLine key={i} event={event} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function ScanHistoryTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useScanHistory(page);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const toggleErrors = (id: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const statusChip = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      completed: { bg: '#ECFDF5', color: '#059669' },
      running: { bg: '#EFF6FF', color: '#0284C7' },
      failed: { bg: '#FEF2F2', color: '#DC2626' },
    };
    const c = colors[status] || { bg: '#F3F4F6', color: '#6B7280' };
    return <Chip label={status} size="small" sx={{ textTransform: 'capitalize', backgroundColor: c.bg, color: c.color, fontWeight: 600, fontSize: '0.6875rem' }} />;
  };

  const modeChip = (mode?: string) => {
    if (!mode) return null;
    const isDelegated = mode === 'delegated';
    return (
      <Chip
        label={isDelegated ? 'User' : 'SP'}
        size="small"
        icon={isDelegated ? <PersonIcon sx={{ fontSize: '0.75rem !important' }} /> : undefined}
        sx={{
          height: 20,
          fontSize: '0.625rem',
          fontWeight: 600,
          backgroundColor: isDelegated ? '#EFF6FF' : '#F3F4F6',
          color: isDelegated ? '#0284C7' : '#6B7280',
        }}
      />
    );
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return '...';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return '<1s';
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  return (
    <Card>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{ px: 2.5, py: 2 }}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Scan History
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Triggered By</TableCell>
                <TableCell align="right">Items</TableCell>
                <TableCell align="right">Expired</TableCell>
                <TableCell align="right">Errors</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#9CA3AF' }}>Loading...</TableCell>
                </TableRow>
              )}
              {data?.items.map((scan) => (
                <TableRow key={scan.id}>
                  <TableCell>{statusChip(scan.status)}</TableCell>
                  <TableCell>
                    <Tooltip title={formatDateTime(scan.startedAt)} arrow>
                      <Typography sx={{ fontSize: '0.8125rem' }}>{formatRelativeTime(scan.startedAt)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                      {getDuration(scan.startedAt, scan.completedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>{modeChip(scan.credentialMode)}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#374151' }}>{scan.triggeredBy}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{scan.itemsFound}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: scan.newExpiredFound > 0 ? '#DC2626' : '#111827' }}>
                      {scan.newExpiredFound}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {scan.errors.length > 0 ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#DC2626' }}>
                          {scan.errors.length}
                        </Typography>
                        <IconButton size="small" onClick={() => toggleErrors(scan.id)} sx={{ p: 0.25 }}>
                          {expandedErrors.has(scan.id) ? <ExpandLessIcon sx={{ fontSize: '1rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>0</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {/* Error expansion rows */}
              {data?.items.filter((s) => expandedErrors.has(s.id) && s.errors.length > 0).map((scan) => (
                <TableRow key={`${scan.id}-errors`}>
                  <TableCell colSpan={8} sx={{ backgroundColor: '#FEF2F2', py: 1.5 }}>
                    {scan.errors.map((err, i) => (
                      <Typography key={i} sx={{ fontSize: '0.75rem', color: '#991B1B', fontFamily: 'monospace', mb: 0.5 }}>
                        {err}
                      </Typography>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#9CA3AF' }}>
                    No scans have been run yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {data && data.items.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
            <Pagination
              count={Math.max(1, Math.ceil(data.items.length < data.pageSize ? page : page + 1))}
              page={page}
              onChange={(_, p) => setPage(p)}
              size="small"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export function ScansPage() {
  const triggerScan = useTriggerScan();
  const { user } = useAuth();
  const { data: activeScan } = useActiveScan();
  const [streamScanId, setStreamScanId] = useState<string | null>(null);

  // If there's an active scan on page load, attach to it
  useEffect(() => {
    if (activeScan?.active && activeScan.scanId && !streamScanId) {
      setStreamScanId(activeScan.scanId);
    }
  }, [activeScan, streamScanId]);

  const handleTrigger = async (useDelegated: boolean) => {
    try {
      const result = await triggerScan.mutateAsync(useDelegated);
      setStreamScanId(result.scanId);
    } catch (err) {
      console.error('Failed to trigger scan:', err);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3.5}>
        <Box>
          <Typography variant="h4">Scans</Typography>
          <Typography sx={{ color: '#6B7280', fontSize: '0.8125rem', mt: 0.5 }}>
            Trigger scans and monitor real-time progress.
          </Typography>
        </Box>
        {user?.isAdmin && (
          <Box display="flex" alignItems="center" gap={1}>
            <Button
              variant="outlined"
              startIcon={<PlayArrowIcon />}
              onClick={() => handleTrigger(false)}
              disabled={triggerScan.isPending || (activeScan?.active ?? false)}
            >
              {triggerScan.isPending ? 'Starting...' : 'Scan Now'}
            </Button>
            {!authDisabledMode && (
              <Tooltip title="Scan using your Entra ID permissions instead of the service principal" arrow>
                <span>
                  <Button
                    variant="contained"
                    startIcon={<PersonIcon />}
                    onClick={() => handleTrigger(true)}
                    disabled={triggerScan.isPending || (activeScan?.active ?? false)}
                  >
                    Scan as Me
                  </Button>
                </span>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      {/* Live log panel */}
      <ScanLogPanel scanId={streamScanId} />

      {/* Scan history */}
      <ScanHistoryTable />
    </Box>
  );
}
