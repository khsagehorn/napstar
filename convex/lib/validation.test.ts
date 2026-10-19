// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { isValidDateKey, isValidTimeZone, todayKeyIn } from './validation';

describe('isValidDateKey', () => {
  test.each(['2026-06-01', '2024-02-29', '2026-12-31'])('accepts %s', (v) => {
    expect(isValidDateKey(v)).toBe(true);
  });
  test.each(['2026-02-29', '2026-13-01', '2026-06-31', '2026-6-1', '06/01/2026', ''])(
    'rejects %s',
    (v) => {
      expect(isValidDateKey(v)).toBe(false);
    },
  );
});

describe('isValidTimeZone', () => {
  test.each(['America/Chicago', 'Europe/London', 'Asia/Kolkata', 'UTC'])('accepts %s', (v) => {
    expect(isValidTimeZone(v)).toBe(true);
  });
  test.each(['Mars/Olympus', 'not a zone', ''])('rejects %s', (v) => {
    expect(isValidTimeZone(v)).toBe(false);
  });
});

describe('todayKeyIn', () => {
  // 2026-06-15 03:00 UTC is still June 14 in Chicago (UTC-5) but June 15 in Kolkata.
  const now = Date.UTC(2026, 5, 15, 3, 0);
  test('uses the zone, not UTC', () => {
    expect(todayKeyIn('America/Chicago', now)).toBe('2026-06-14');
    expect(todayKeyIn('Asia/Kolkata', now)).toBe('2026-06-15');
  });
});
