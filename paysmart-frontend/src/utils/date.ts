/**
 * Smart relative date formatter.
 *
 * Today             → "Today · 2:30 PM"
 * Yesterday         → "Yesterday · 8:15 AM"
 * This week (≤6d)   → "Tue, May 27 · 9:00 AM"
 * Older             → "May 15 · 3:20 PM"
 */
export function smartDate(dateStr: string): string {
  const date  = new Date(dateStr);
  const now   = new Date();

  const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const itemStart      = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  if (itemStart.getTime() === todayStart.getTime()) {
    return `Today · ${timeStr}`;
  }
  if (itemStart.getTime() === yesterdayStart.getTime()) {
    return `Yesterday · ${timeStr}`;
  }

  const daysAgo = Math.floor((todayStart.getTime() - itemStart.getTime()) / 86_400_000);
  if (daysAgo < 7) {
    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `${dayLabel} · ${timeStr}`;
  }

  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${dateLabel} · ${timeStr}`;
}

/** Returns a string key that is unique per calendar day — used for grouping. */
export function dayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Human-readable day label for a group header.
 *
 * Today      → "Today"
 * Yesterday  → "Yesterday"
 * ≤6d ago    → "Tue, May 27"
 * Older      → "May 15, 2026"
 */
export function dayHeader(dateStr: string): string {
  const date  = new Date(dateStr);
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yest  = new Date(today.getTime() - 86_400_000);
  const item  = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (item.getTime() === today.getTime()) return 'Today';
  if (item.getTime() === yest.getTime())  return 'Yesterday';

  const daysAgo = Math.floor((today.getTime() - item.getTime()) / 86_400_000);
  if (daysAgo < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Just the clock time — "23:37". Use inside day groups. */
export function timeOnly(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
