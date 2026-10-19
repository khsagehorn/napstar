---
name: testing
description: How to write and run tests for the baby tracker — Vitest + convex-test for Convex functions and pure logic, including required access-control and DST test cases. Use this whenever you add or change code in convex/ (functions or lib/), fix a bug, set up the test runner, or when a test fails — and before checking off any plan task.
---

# Testing

The highest-value tests in this app fall into three areas, in priority order:

1. **Access control.** A user must never see or change another household's data.
2. **Time and aggregation math.** Day boundaries, DST, midnight splits, and unit round-trips.
3. **Mutation validation.** Bad input is rejected server-side.

UI component tests are low priority for v1. Device testing at the end of each
phase covers the UI. Don't spend time on snapshot tests.

## Setup

- Tests live next to the code as `convex/**/*.test.ts`.
- `vitest.config.ts`:
  ```ts
  import { defineConfig } from "vitest/config";
  export default defineConfig({
    test: {
      environment: "edge-runtime",
      server: { deps: { inline: ["convex-test"] } },
    },
  });
  ```
- If pure-lib tests hit an `Intl` time-zone issue under edge-runtime, give them a
  node environment via a `// @vitest-environment node` comment at the top of the file.

## convex-test pattern

```ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function setupHousehold(t: ReturnType<typeof convexTest>, token: string) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { tokenIdentifier: token, unitPreference: "ml" });
    const householdId = await ctx.db.insert("households", { name: "H", createdBy: userId });
    await ctx.db.insert("householdMembers", { householdId, userId, role: "owner" });
    const childId = await ctx.db.insert("children", {
      householdId, name: "Baby", birthDate: "2026-06-01", timezone: "America/Chicago",
    });
    return { userId, householdId, childId };
  });
}

test("non-member cannot read another household's events", async () => {
  const t = convexTest(schema, modules);
  const a = await setupHousehold(t, "token-a");
  await setupHousehold(t, "token-b");
  const asB = t.withIdentity({ tokenIdentifier: "token-b" });
  await expect(asB.query(api.events.latestByType, { childId: a.childId })).rejects.toThrow();
});
```

Put `setupHousehold` and other fixtures in `convex/test/fixtures.ts` so every
test file shares them.

## Required test cases

**Access control** (`convex/lib/auth.test.ts` + per-module tests)
- An unauthenticated call to any public function throws.
- A non-member can't query, create, update, delete, start, or stop timers on another household's child.
- A removed caregiver loses access immediately (Phase 4).
- `update` can't move an event to a different `childId` or change its `type`.

**Time** (`convex/lib/time.test.ts`)
- `dayRange("2026-03-08", "America/Chicago")` spans 23 hours (spring forward).
- `dayRange("2026-11-01", "America/Chicago")` spans 25 hours (fall back).
- `dayRange("2026-03-29", "Europe/London")` spans 23 hours.
- `dayRange("2026-06-15", "Asia/Kolkata")[0] === Date.UTC(2026, 5, 14, 18, 30)` (half-hour offset).
- `splitIntervalByDay` for 22:00 → 06:00 local (Chicago, June) returns 2h on day one and 6h on day two.
- `splitIntervalByDay` across a DST night sums to the true elapsed ms.
- `lastNDays("2026-03-01", 7)` crosses the February boundary correctly.

**Units** (`convex/lib/units.test.ts`)
- `fromMl(toMl(x, "oz"), "oz") === x` for x = 0.5, 1, 1.5 … 10.
- `toMl(120, "ml") === 120`.

**Aggregation** (`convex/lib/aggregate.test.ts`)
- Milk includes breast_milk and formula, and excludes solids.
- A "both" diaper counts in wet and dirty.
- An open sleep is clamped to `now`, and no time after `now` is counted.
- Sleep that started yesterday contributes only its after-midnight portion today.
- Pump volume counts on the start day, even if the session ends after midnight.
- An empty day returns all zeros.

**Mutations** (`convex/events.test.ts`)
- `endAt <= startAt` is rejected, as is a diaper with neither wet nor dirty, and a negative or huge amount.
- A second `startTimer` for the same child and type is rejected while one is open.
- `loggedBy` is set from the identity and ignored if a client tries to supply it.

## When a test fails

Read the failure, fix the code (or the test if the test is wrong, and say so in your
summary), and re-run. Never skip, delete, or weaken a test to get green
without telling the user why.
