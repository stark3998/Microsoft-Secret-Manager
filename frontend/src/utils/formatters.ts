import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy HH:mm');
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatDaysUntilExpiration(days: number | null): string {
  if (days === null) return 'No expiry';
  if (days < 0) return `Expired ${Math.abs(days)} days ago`;
  if (days === 0) return 'Expires today';
  return `${days} days`;
}

export function getExpirationColor(days: number | null): string {
  if (days === null) return '#8A8886';
  if (days < 0) return '#D13438';
  if (days <= 7) return '#D83B01';
  if (days <= 30) return '#F7630C';
  if (days <= 90) return '#0078D4';
  return '#107C10';
}
