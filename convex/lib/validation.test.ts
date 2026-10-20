// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { Id } from '../_generated/dataModel';
import type { EventInput } from '../validators';
import { eventRuleError, isValidDateKey, isValidTimeZone, todayKeyIn } from './validation';

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

describe('eventRuleError', () => {
  const now = Date.UTC(2026, 9, 19, 15, 0);
  const min = 60 * 1000;
  const childId = 'child' as Id<'children'>;
  const sleep = (startAt: number, endAt?: number): EventInput => ({
    type: 'sleep',
    childId,
    startAt,
    endAt,
  });

  test('accepts a finished sleep and a running one', () => {
    expect(eventRuleError(sleep(now - 60 * min, now - 10 * min), now)).toBeNull();
    expect(eventRuleError(sleep(now - 60 * min), now)).toBeNull();
  });

  test('requires the end to be strictly after the start', () => {
    expect(eventRuleError(sleep(now - min, now - min), now)).toMatch('after start');
    expect(eventRuleError(sleep(now - min, now - 2 * min), now)).toMatch('after start');
  });

  test('allows up to 5 minutes of clock drift, not more', () => {
    expect(eventRuleError(sleep(now + 5 * min), now)).toBeNull();
    expect(eventRuleError(sleep(now + 5 * min + 1), now)).toMatch('future');
    expect(eventRuleError(sleep(now - min, now + 5 * min + 1), now)).toMatch('future');
  });

  test.each([NaN, Infinity])('rejects a non-finite time (%s)', (bad) => {
    expect(eventRuleError(sleep(bad), now)).toMatch('valid start');
    expect(eventRuleError(sleep(now - min, bad), now)).toMatch('valid end');
  });

  test.each([0, 0.5, 120, 1000])('accepts an amount of %s ml', (amountMl) => {
    expect(
      eventRuleError({ type: 'pump', childId, startAt: now - min, endAt: now, amountMl }, now),
    ).toBeNull();
  });

  test.each([-0.1, 1000.1, NaN, Infinity])('rejects an amount of %s ml', (amountMl) => {
    expect(
      eventRuleError({ type: 'feeding', childId, startAt: now, method: 'formula', amountMl }, now),
    ).toMatch('between 0 and 1000');
  });

  test.each([
    [true, false],
    [false, true],
    [true, true],
  ])('accepts a diaper with wet=%s dirty=%s', (wet, dirty) => {
    expect(eventRuleError({ type: 'diaper', childId, startAt: now, wet, dirty }, now)).toBeNull();
  });

  test('rejects a diaper that is neither wet nor dirty', () => {
    expect(
      eventRuleError({ type: 'diaper', childId, startAt: now, wet: false, dirty: false }, now),
    ).toMatch('wet, dirty, or both');
  });

  test.each(['breast_milk', 'formula'] as const)('rejects a food name on %s', (method) => {
    expect(
      eventRuleError({ type: 'feeding', childId, startAt: now, method, foodName: 'pear' }, now),
    ).toMatch('only for solids');
  });

  test('allows a food name on solids', () => {
    expect(
      eventRuleError(
        { type: 'feeding', childId, startAt: now, method: 'solid', foodName: 'pear' },
        now,
      ),
    ).toBeNull();
  });
});
