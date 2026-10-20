// Pure time helpers shared by the backend and the app (see the time-and-units
// skill). Day-boundary helpers (dayKey, dayRange, ...) arrive with task 3.1.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "2h 05m" or "14m". Rounds down to the minute; negative counts as 0. */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(Math.max(0, ms) / MINUTE);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/**
 * "just now", "2h 05m ago", or "3d 4h ago" for an elapsed `ms`. Slightly
 * negative values (a start up to 5 minutes ahead, from clock drift) read as
 * "just now".
 */
export function formatAgo(ms: number): string {
  if (ms < MINUTE) return 'just now';
  if (ms < DAY) return `${formatDuration(ms)} ago`;
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  return `${d}d ${h}h ago`;
}
