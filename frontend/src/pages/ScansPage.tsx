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
  Breadcrumbs,
  Link,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import TerminalIcon from '@mui/icons-material/TerminalOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HomeIcon from '@mui/icons-material/HomeOutlined';
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
      <Box component="span" sx={{ color: '#605E5C', flexShrink: 0, userSelect: 'none' }}>
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
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1, borderBottom: '1px solid #1F2937', backgroundColor: '#1B1A19', borderRadius: '2px 2px 0 0',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TerminalIcon sx={{ fontSize: '1rem', color: '#A19F9D' }} />
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#D2D0CE' }}>
              Scan Log
            </Typography>
            {isConnected && !isComplete && (
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%', backgroundColor: '#107C10', ml: 0.5,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
              }} />
            )}
            {isComplete && (
              <Chip label="Complete" size="small" sx={{ height: 20, fontSize: '0.625rem', backgroundColor: '#107C10', color: '#fff', ml: 0.5, borderRadius: '2px' }} />
            )}
          </Box>
          <Typography sx={{ fontSize: '0.6875rem', color: '#605E5C' }}>
            {logs.length} events
          </Typography>
        </Box>

        <Box
          ref={scrollRef}
          onScroll={handleScroll}
          sx={{
            backgroundColor: '#252423',
            px: 2,
            py: 1.5,
            maxHeight: 400,
            minHeight: 120,
            overflowY: 'auto',
            borderRadius: '0 0 2px 2px',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-track': { background: '#3B3A39' },
            '&::-webkit-scrollbar-thumb': { background: '#605E5C', borderRadius: 3 },
          }}
        >
          {logs.length === 0 && (
            <Typography sx={{ color: '#605E5C', fontSize: '0.8125rem', fontFamily: 'monospace' }}>
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
      completed: { bg: '#DFF6DD', color: '#107C10' },
      running: { bg: '#DEECF9', color: '#0078D4' },
      failed: { bg: '#FDE7E9', color: '#D13438' },
    };
    const c = colors[status] || { bg: '#F3F2F1', color: '#605E5C' };
    return <Chip label={status} size="small" sx={{ textTransform: 'capitalize', backgroundColor: c.bg, color: c.color, fontWeight: 600, fontSize: '0.6875rem', borderRadius: '2px' }} />;
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
          height: 20, fontSize: '0.625rem', fontWeight: 600, borderRadius: '2px',
          backgroundColor: isDelegated ? '#DEECF9' : '#F3F2F1',
          color: isDelegated ? '#0078D4' : '#605E5C',
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
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #EDEBE9' }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#323130' }}>
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
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#A19F9D' }}>Loading...</TableCell>
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
                    <Typography sx={{ fontSize: '0.8125rem', color: '#605E5C' }}>
                      {getDuration(scan.startedAt, scan.completedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>{modeChip(scan.credentialMode)}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#323130' }}>{scan.triggeredBy}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{scan.itemsFound}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: scan.newExpiredFound > 0 ? '#D13438' : '#323130' }}>
                      {scan.newExpiredFound}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {scan.errors.length > 0 ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#D13438' }}>
                          {scan.errors.length}
                        </Typography>
                        <IconButton size="small" onClick={() => toggleErrors(scan.id)} sx={{ p: 0.25 }}>
                          {expandedErrors.has(scan.id) ? <ExpandLessIcon sx={{ fontSize: '1rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: '0.8125rem', color: '#A19F9D' }}>0</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data?.items.filter((s) => expandedErrors.has(s.id) && s.errors.length > 0).map((scan) => (
                <TableRow key={`${scan.id}-errors`}>
                  <TableCell colSpan={8} sx={{ backgroundColor: '#FDE7E9', py: 1.5 }}>
                    {scan.errors.map((err, i) => (
                      <Typography key={i} sx={{ fontSize: '0.75rem', color: '#A4262C', fontFamily: 'monospace', mb: 0.5 }}>
                        {err}
                      </Typography>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#A19F9D' }}>
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
      <Breadcrumbs sx={{ mb: 1.5, '& .MuiBreadcrumbs-separator': { color: '#A19F9D' } }}>
        <Link underline="hover" color="#605E5C" href="/" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.8125rem' }}>
          <HomeIcon sx={{ fontSize: '0.875rem', mr: 0.5 }} />
          Home
        </Link>
        <Typography sx={{ fontSize: '0.8125rem', color: '#323130', fontWeight: 600 }}>Scans</Typography>
      </Breadcrumbs>

      <Box mb={2}>
        <Typography variant="h4">Scans</Typography>
        <Typography sx={{ color: '#605E5C', fontSize: '0.8125rem', mt: 0.5 }}>
          Trigger scans and monitor real-time progress.
        </Typography>
      </Box>

      {/* Command bar */}
      {user?.isAdmin && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
          px: 1.5, py: 0.75, backgroundColor: '#FFFFFF', border: '1px solid #EDEBE9', borderRadius: '2px',
          boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
        }}>
          <Button
            variant="text"
            startIcon={<PlayArrowIcon />}
            size="small"
            onClick={() => handleTrigger(false)}
            disabled={triggerScan.isPending || (activeScan?.active ?? false)}
          >
            {triggerScan.isPending ? 'Starting...' : 'Scan Now'}
          </Button>
          {!authDisabledMode && (
            <Tooltip title="Scan using your Entra ID permissions instead of the service principal" arrow>
              <span>
                <Button
                  variant="text"
                  startIcon={<PersonIcon />}
                  size="small"
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

      <ScanLogPanel scanId={streamScanId} />
      <ScanHistoryTable />
    </Box>
  );
}
