// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { formatAgo, formatDuration } from './time';

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;

describe('formatDuration', () => {
  test.each([
    [0, '0m'],
    [59 * SEC, '0m'],
    [14 * MIN, '14m'],
    [59 * MIN + 59 * SEC, '59m'],
    [HOUR, '1h 00m'],
    [HOUR + 5 * MIN, '1h 05m'],
    [2 * HOUR + 14 * MIN, '2h 14m'],
    [30 * HOUR, '30h 00m'],
    [-5 * MIN, '0m'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatAgo', () => {
  test.each([
    [-4 * MIN, 'just now'],
    [0, 'just now'],
    [59 * SEC, 'just now'],
    [MIN, '1m ago'],
    [2 * HOUR + 14 * MIN, '2h 14m ago'],
    [23 * HOUR + 59 * MIN, '23h 59m ago'],
    [24 * HOUR, '1d 0h ago'],
    [26 * HOUR + 30 * MIN, '1d 2h ago'],
    [75 * HOUR, '3d 3h ago'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatAgo(ms)).toBe(expected);
  });
});
