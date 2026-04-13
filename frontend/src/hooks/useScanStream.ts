import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../api/scans';
import type { ScanLogEvent } from '../types';

interface UseScanStreamResult {
  logs: ScanLogEvent[];
  isConnected: boolean;
  isComplete: boolean;
  clearLogs: () => void;
}

/**
 * Connects to the backend SSE endpoint for a given scan and accumulates log events.
 * Uses fetch + ReadableStream to support Authorization headers.
 */
export function useScanStream(scanId: string | null): UseScanStreamResult {
  const [logs, setLogs] = useState<ScanLogEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const clearLogs = useCallback(() => {
    setLogs([]);
    setIsComplete(false);
  }, []);

  useEffect(() => {
    if (!scanId) return;

    setLogs([]);
    setIsComplete(false);

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const token = await getAuthToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/scans/stream/${scanId}`, {
          headers,
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setIsConnected(false);
          return;
        }

        setIsConnected(true);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE messages are separated by double newlines
          const parts = buffer.split('\n\n');
          buffer = parts.pop()!;

          for (const block of parts) {
            if (!block.trim() || block.startsWith(':')) continue; // skip keepalives/comments

            const dataLine = block.split('\n').find((l) => l.startsWith('data: '));
            if (!dataLine) continue;

            try {
              const event: ScanLogEvent = JSON.parse(dataLine.slice(6));
              setLogs((prev) => [...prev, event]);

              if (event.type === 'complete' || event.type === 'failed') {
                setIsComplete(true);
                // Invalidate all data queries to fetch fresh scan results
                queryClient.invalidateQueries({ queryKey: ['keyvault-items'] });
                queryClient.invalidateQueries({ queryKey: ['app-registrations'] });
                queryClient.invalidateQueries({ queryKey: ['enterprise-apps'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
                queryClient.invalidateQueries({ queryKey: ['scan-history'] });
              }
            } catch {
              // skip malformed events
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Scan stream error:', err);
        }
      } finally {
        setIsConnected(false);
      }
    })();

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [scanId]);

  return { logs, isConnected, isComplete, clearLogs };
}
