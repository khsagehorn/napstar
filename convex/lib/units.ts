// Volume conversion at the input/display boundary. Amounts are always stored
// in ml; oz exists only on screen (see the time-and-units skill).

import type { UnitPreference } from '../validators';

export type VolumeUnit = UnitPreference;

export const ML_PER_OZ = 29.5735;

/** User input in `unit` → ml for storage, rounded to 0.1 ml to avoid float noise. */
export function toMl(value: number, unit: VolumeUnit): number {
  const ml = unit === 'oz' ? value * ML_PER_OZ : value;
  return Math.round(ml * 10) / 10;
}

/** Stored ml → `unit` for display: whole ml, or oz to one decimal. */
export function fromMl(ml: number, unit: VolumeUnit): number {
  return unit === 'oz' ? Math.round((ml / ML_PER_OZ) * 10) / 10 : Math.round(ml);
}

export function formatVolume(ml: number, unit: VolumeUnit): string {
  return `${fromMl(ml, unit)} ${unit}`;
}

/**
 * Parses a typed decimal ("4", "4.5", ".5", or "4,5" for comma locales).
 * Returns null for anything else, including an empty string.
 */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;
  return Number(normalized);
}
