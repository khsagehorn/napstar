// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { formatVolume, fromMl, parseDecimal, toMl } from './units';

describe('toMl / fromMl', () => {
  const halfOunces = Array.from({ length: 20 }, (_, i) => (i + 1) / 2); // 0.5 … 10

  test.each(halfOunces)('%s oz survives a round trip through storage', (oz) => {
    expect(fromMl(toMl(oz, 'oz'), 'oz')).toBe(oz);
  });

  test('ml passes through unchanged', () => {
    expect(toMl(120, 'ml')).toBe(120);
    expect(fromMl(120, 'ml')).toBe(120);
  });

  test('stores oz as ml rounded to 0.1', () => {
    expect(toMl(4, 'oz')).toBe(118.3);
  });

  test('shows whole ml and oz to one decimal', () => {
    expect(fromMl(118.3, 'ml')).toBe(118);
    expect(fromMl(100, 'oz')).toBe(3.4);
  });
});

describe('formatVolume', () => {
  test('includes the unit', () => {
    expect(formatVolume(118.3, 'oz')).toBe('4 oz');
    expect(formatVolume(120, 'ml')).toBe('120 ml');
  });
});

describe('parseDecimal', () => {
  test.each([
    ['4', 4],
    ['4.5', 4.5],
    ['4,5', 4.5],
    ['.5', 0.5],
    ['4.', 4],
    [' 120 ', 120],
    ['0', 0],
  ])('parses %j', (text, expected) => {
    expect(parseDecimal(text)).toBe(expected);
  });

  test.each(['', ' ', 'abc', '4oz', '-1', '1.2.3', '1e3', '.'])('rejects %j', (text) => {
    expect(parseDecimal(text)).toBeNull();
  });
});
