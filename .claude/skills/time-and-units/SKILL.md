---
name: time-and-units
description: Rules and reference code for dates, times, time zones, "today", DST, durations that cross midnight, and ml/oz conversion in the baby tracker. Use this whenever code computes a day boundary, groups events by day, formats a time or duration, shows "X ago", handles a date picker, or reads, writes, or displays a milk/pump amount — these are the most bug-prone parts of the app.
---

# Time and units

Parents notice immediately when "today's milk" is wrong. Almost every such bug
comes from one of three mistakes: computing days in UTC, assuming a day is 24
hours long, or mixing ml and oz. The rules below prevent all three.

## Rules

1. **Store UTC epoch ms** (`number`) for every timestamp.
2. **A "day" belongs to the child's time zone** (`children.timezone`, IANA name),
   not the device's and not UTC. Identify days with a `dayKey` string `"YYYY-MM-DD"`.
3. **Day ranges are half-open** `[start, end)` and computed with time-zone-aware
   date math. DST days are 23 or 25 hours long. Never do `start + 86_400_000`.
4. **Durations are intervals.** Sleep or pumping that crosses midnight is split
   across days with `splitIntervalByDay`. A running timer (no `endAt`) is treated
   as ending at `now` for display and totals.
5. **Volumes are stored in ml.** Convert at the input and display boundary only.
6. All of this lives in `convex/lib/time.ts` and `convex/lib/units.ts`, with
   no React or Convex imports, so the server and the app share one implementation.

## Reference: `convex/lib/time.ts`

```ts
import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfDay, subDays } from "date-fns";

export type DayKey = string; // "YYYY-MM-DD"

export function dayKey(ms: number, tz: string): DayKey {
  return format(new TZDate(ms, tz), "yyyy-MM-dd");
}

/** Half-open [start, end) in UTC ms for a calendar day in `tz`. DST-safe. */
export function dayRange(key: DayKey, tz: string): [number, number] {
  const [y, m, d] = key.split("-").map(Number);
  const start = startOfDay(new TZDate(y, m - 1, d, tz));
  const end = addDays(start, 1); // wall-clock arithmetic in tz → 23/24/25h
  return [start.getTime(), end.getTime()];
}

/** The n day keys ending at (and including) endKey, oldest first. */
export function lastNDays(endKey: DayKey, n: number): DayKey[] {
  const [y, m, d] = endKey.split("-").map(Number);
  const end = new TZDate(y, m - 1, d, "UTC"); // calendar math only
  return Array.from({ length: n }, (_, i) =>
    format(subDays(end, n - 1 - i), "yyyy-MM-dd"),
  );
}

/** Split [startMs, endMs) into per-day millisecond chunks in tz. */
export function splitIntervalByDay(
  startMs: number,
  endMs: number,
  tz: string,
): { day: DayKey; ms: number }[] {
  const out: { day: DayKey; ms: number }[] = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const day = dayKey(cursor, tz);
    const [, dayEnd] = dayRange(day, tz);
    const segEnd = Math.min(dayEnd, endMs);
    out.push({ day, ms: segEnd - cursor });
    cursor = segEnd;
  }
  return out;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
```

If `@date-fns/tz` behaves differently in the installed version, keep these
function signatures and fix the internals. The tests in `testing` define
correctness.

## Reference: `convex/lib/units.ts`

```ts
export type VolumeUnit = "ml" | "oz";
export const ML_PER_OZ = 29.5735;

export function toMl(value: number, unit: VolumeUnit): number {
  const ml = unit === "oz" ? value * ML_PER_OZ : value;
  return Math.round(ml * 10) / 10; // avoid float noise in storage
}

export function fromMl(ml: number, unit: VolumeUnit): number {
  return unit === "oz" ? Math.round((ml / ML_PER_OZ) * 10) / 10 : Math.round(ml);
}

export function formatVolume(ml: number, unit: VolumeUnit): string {
  return `${fromMl(ml, unit)} ${unit}`;
}
```

Round-tripping matters. A user who types "4 oz" and later edits the entry must
see "4 oz", not "3.9 oz". Add a test for whole and half ounces from 0.5 to 10.

## In the app

- **"Now" ticks.** Use a `useNow(intervalMs)` hook (state + `setInterval`) for
  "2h 14m ago" text and running-timer elapsed time. A component that renders
  `Date.now()` once will freeze.
- **Today's key.** On the client, compute `dayKey(Date.now(), child.timezone)`
  and pass it to trends queries. Recompute it when the app returns to the
  foreground (`AppState`), because "today" changes at midnight while the app sits open.
- **Date pickers** return device-local `Date`s. Convert with `.getTime()`. When the
  child's zone differs from the device's (e.g. travelling), show times in the
  child's zone and say so in the UI.
- **Display formats.** Use `format(new TZDate(ms, tz), "h:mm a")` for times and
  `formatDuration` for durations. Don't hand-roll string padding elsewhere.
- **Amount inputs** show and accept the user's unit (from `useUnits()`), and call
  `toMl` once on submit.
