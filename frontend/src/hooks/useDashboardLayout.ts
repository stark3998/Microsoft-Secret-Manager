import { useState, useCallback, useMemo } from 'react';

export interface DashboardWidget {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'overview-cards', title: 'Overview Cards', visible: true, order: 0 },
  { id: 'expiration-chart', title: 'Expiration Timeline', visible: true, order: 1 },
  { id: 'recent-activity', title: 'Recent Activity', visible: true, order: 2 },
  { id: 'expiring-soon', title: 'Expiring This Week', visible: true, order: 3 },
  { id: 'zombie-apps', title: 'Zombie Applications', visible: false, order: 4 },
  { id: 'scan-status', title: 'Last Scan Summary', visible: true, order: 5 },
];

const STORAGE_KEY = 'sm-dashboard-layout';

function loadLayout(): DashboardWidget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as DashboardWidget[];
      // Merge with defaults to pick up new widgets
      const savedMap = new Map(saved.map((w) => [w.id, w]));
      return DEFAULT_WIDGETS.map((dw) => savedMap.get(dw.id) || dw).sort((a, b) => a.order - b.order);
    }
  } catch { /* ignore */ }
  return DEFAULT_WIDGETS;
}

function persistLayout(widgets: DashboardWidget[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch { /* ignore */ }
}

export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(loadLayout);

  const toggleWidget = useCallback((id: string) => {
    setWidgets((prev) => {
      const updated = prev.map((w) => w.id === id ? { ...w, visible: !w.visible } : w);
      persistLayout(updated);
      return updated;
    });
  }, []);

  const moveWidget = useCallback((id: string, direction: 'up' | 'down') => {
    setWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const updated = [...prev];
      [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
      const reordered = updated.map((w, i) => ({ ...w, order: i }));
      persistLayout(reordered);
      return reordered;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    persistLayout(DEFAULT_WIDGETS);
  }, []);

  const visibleWidgets = useMemo(() => widgets.filter((w) => w.visible), [widgets]);

  return { widgets, visibleWidgets, toggleWidget, moveWidget, resetLayout };
}
