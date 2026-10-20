// Pure input checks shared by mutations (and safe to import from the app).

import type { EventInput } from '../validators';

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date in `YYYY-MM-DD` form. */
export function isValidDateKey(value: string): boolean {
  const match = DATE_KEY.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** True if `value` is an IANA time zone the runtime recognizes. */
export function isValidTimeZone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Today's `YYYY-MM-DD` in `timeZone` at instant `now` (UTC ms). */
export function todayKeyIn(timeZone: string, now: number): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export const MAX_NAME_LENGTH = 50;

export const MAX_AMOUNT_ML = 1000;
/** How far ahead of the server clock a time may be, to absorb device clock drift. */
export const FUTURE_GRACE_MS = 5 * 60 * 1000;

/**
 * The first business rule `event` breaks at instant `now` (UTC ms), as a
 * user-facing message, or null if it's valid. Shapes are checked by the
 * Convex validators; this covers what they can't express.
 */
export function eventRuleError(event: EventInput, now: number): string | null {
  const latest = now + FUTURE_GRACE_MS;
  if (!Number.isFinite(event.startAt)) return 'Enter a valid start time';
  if (event.startAt > latest) return "Start time can't be in the future";

  if ('endAt' in event && event.endAt !== undefined) {
    if (!Number.isFinite(event.endAt)) return 'Enter a valid end time';
    if (event.endAt <= event.startAt) return 'End time must be after start time';
    if (event.endAt > latest) return "End time can't be in the future";
  }

  if ('amountMl' in event && event.amountMl !== undefined) {
    const ml = event.amountMl;
    if (!Number.isFinite(ml) || ml < 0 || ml > MAX_AMOUNT_ML) {
      return `Amount must be between 0 and ${MAX_AMOUNT_ML} ml`;
    }
  }

  if (event.type === 'diaper' && !event.wet && !event.dirty) return 'Choose wet, dirty, or both';
  if (event.type === 'feeding' && event.foodName !== undefined && event.method !== 'solid') {
    return 'A food name is only for solids';
  }
  return null;
}
