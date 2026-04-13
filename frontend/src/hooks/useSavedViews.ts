import { useState, useCallback, useMemo } from 'react';

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, string>;
  createdAt: string;
}

const STORAGE_KEY = 'sm-saved-views';

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistViews(views: SavedView[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch { /* ignore */ }
}

export function useSavedViews(pageKey: string) {
  const [allViews, setAllViews] = useState<SavedView[]>(loadViews);

  const views = useMemo(
    () => allViews.filter((v) => v.id.startsWith(`${pageKey}:`)),
    [allViews, pageKey]
  );

  const saveView = useCallback(
    (name: string, filters: Record<string, string>) => {
      const view: SavedView = {
        id: `${pageKey}:${Date.now()}`,
        name,
        filters,
        createdAt: new Date().toISOString(),
      };
      const updated = [...allViews, view];
      setAllViews(updated);
      persistViews(updated);
      return view;
    },
    [allViews, pageKey]
  );

  const deleteView = useCallback(
    (id: string) => {
      const updated = allViews.filter((v) => v.id !== id);
      setAllViews(updated);
      persistViews(updated);
    },
    [allViews]
  );

  return { views, saveView, deleteView };
}
