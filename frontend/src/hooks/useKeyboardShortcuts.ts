import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';

interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts: ShortcutHandler[] = [
    { key: '/', description: 'Focus search', action: () => {
      const el = document.querySelector<HTMLInputElement>('[data-search-input]');
      if (el) { el.focus(); el.select(); }
    }},
    { key: 'g', shift: true, description: 'Go to Dashboard', action: () => navigate(ROUTES.DASHBOARD) },
    { key: 's', shift: true, description: 'Go to Scans', action: () => navigate(ROUTES.SCANS) },
    { key: 'v', shift: true, description: 'Go to Key Vault Items', action: () => navigate(ROUTES.KEYVAULT_ITEMS) },
    { key: 'r', shift: true, description: 'Go to App Registrations', action: () => navigate(ROUTES.APP_REGISTRATIONS) },
    { key: '?', description: 'Show keyboard shortcuts', action: () => {
      // Dispatch a custom event that can be caught by a shortcuts dialog
      window.dispatchEvent(new CustomEvent('show-shortcuts'));
    }},
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    // Don't trigger if Ctrl+K (that's the command palette)
    if (e.ctrlKey && e.key === 'k') return;

    for (const shortcut of shortcuts) {
      if (shortcut.ctrl && !e.ctrlKey) continue;
      if (shortcut.shift && !e.shiftKey) continue;
      if (!shortcut.ctrl && e.ctrlKey) continue;
      if (!shortcut.shift && e.shiftKey && shortcut.key !== '?') continue;
      if (e.key === shortcut.key || e.key === shortcut.key.toUpperCase()) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}
