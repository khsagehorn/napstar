---
name: trends-and-charts
description: How the baby tracker computes daily totals (milk intake, sleep, diapers, pumping, meds) and 7-day series, and how the Trends screen renders charts with victory-native. Use this whenever working on convex/trends.ts, convex/lib/aggregate.ts, the Trends tab, any chart, or any number described as a "total", "average", or "per day".
---

# Trends and charts

Always load `time-and-units` with this skill. Every number here depends on day
boundaries.

## Architecture

```
client: dayKey(now, child.timezone) ──▶ trends.dailySummary / trends.weeklySeries (Convex query)
                                         │  1 indexed range read via by_child_time
                                         ▼
                                  lib/aggregate.ts  (pure, fully unit-tested)
```

All math lives in pure functions. The Convex queries only check access, fetch
events, and call those functions. This keeps the tricky logic testable without a
database.

## `DailySummary`

```ts
export type DailySummary = {
  day: DayKey;
  milkMl: number;        // feeding with method breast_milk | formula, sum of amountMl
  bottleCount: number;   // those same feedings, counted
  solidsCount: number;   // feeding with method solid
  sleepMs: number;       // sleep intervals split by day; open sleep ends at `now`
  sleepSessions: number; // sleeps overlapping this day
  pumpMl: number;        // pump amountMl, attributed to the day the session started
  pumpCount: number;
  wetCount: number;      // diapers with wet (a "both" counts in wet AND dirty)
  dirtyCount: number;
  medsCount: number;
  inProgress: boolean;   // day is today (dayRange contains now)
};

export type Metric = "milkMl" | "sleepMs" | "pumpMl" | "diapers" | "medsCount";
```

Attribution rules (keep these consistent and covered by tests):

- **Point events** (feeding, diaper, medication) belong to the day of `startAt`.
- **Sleep** is split across days by `splitIntervalByDay`. Clamp an open sleep to
  `min(now, dayEnd)`, and ignore any portion after `now`.
- **Pumping volume** belongs to the day the session started (volumes can't be split).

## Queries

```ts
export const weeklySeries = query({
  args: { childId: v.id("children"), endDay: v.string(), now: v.number() },
  handler: async (ctx, { childId, endDay, now }) => {
    const { child } = await requireChildAccess(ctx, childId);
    const days = lastNDays(endDay, 7);
    const [rangeStart] = dayRange(days[0], child.timezone);
    const [, rangeEnd] = dayRange(days[6], child.timezone);
    const events = await ctx.db
      .query("events")
      .withIndex("by_child_time", (q) =>
        q.eq("childId", childId).gte("startAt", rangeStart - 24 * 3_600_000).lt("startAt", rangeEnd),
      )
      .collect(); // bounded: ~8 days of events
    return days.map((d) => summarizeDay(events, d, child.timezone, now));
  },
});
```

- **Fetch once and summarize per day.** Never issue seven separate queries.
- The `-24h` lookback catches sleep that started the day before the range.
- Return every metric per day, and let the client pick which one to chart. Switching
  metrics is then instant and doesn't need a new subscription.
- `now` comes from the client and is rounded to the minute (`Math.floor(now/60000)*60000`)
  so the query arguments don't change on every render.

## Trends screen

- At the top, show a row or grid of **Today** cards: milk (in the user's unit), sleep
  (`formatDuration`), diapers ("6 wet · 3 dirty"), pumped, and meds. Tapping a card
  selects that metric for the chart below.
- Below that, show a **7-day bar chart** of the selected metric, with day labels like
  `Mon`, `Tue` from the dayKey, and the average across *completed* days shown as
  text or a reference line.
- Add previous/next week arrows. Disable "next" when the window ends today.
- Draw today's bar with reduced opacity or a pattern, and label it "so far".
- Days with no events show a zero-height bar, not a missing bar.
- Convert ml values with `fromMl` **before** handing them to the chart, so axis
  labels match the user's unit. Show sleep in hours with one decimal place.

## victory-native

victory-native (v40+, "XL") renders with Skia and needs
`@shopify/react-native-skia`, `react-native-reanimated`, and
`react-native-gesture-handler`. The API changed significantly from older
Victory, so ignore any `VictoryBar` / `VictoryChart` examples. The general shape:

```tsx
import { CartesianChart, Bar } from "victory-native";
import { useFont } from "@shopify/react-native-skia";

<CartesianChart data={rows} xKey="label" yKeys={["value"]} domainPadding={{ left: 24, right: 24 }} /* axis config: check current docs */>
  {({ points, chartBounds }) => (
    <Bar points={points.value} chartBounds={chartBounds} color={theme.colors.accent} roundedCorners={{ topLeft: 6, topRight: 6 }} />
  )}
</CartesianChart>
```

- Axis labels need a Skia font (`useFont(require(...), 12)`), so bundle one font
  file in `assets/fonts/`.
- Axis configuration props have changed between versions. Check the installed
  version's docs rather than guessing.
- Wrap the chart in a fixed-height `View` (e.g. 220), because it fills its parent.
- Pull colors from theme tokens so dark mode works.

Build one reusable `<WeeklyBarChart rows unitLabel highlightLast />` in
`src/features/trends/` and use it for every metric.
