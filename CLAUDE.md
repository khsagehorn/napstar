# Baby Tracker — Project Guide for Claude Code

A cross-platform (iOS/Android) baby activity tracker. Caregivers in a shared
household log feedings, sleep, pumping, medications, and diaper changes for each
child, and view daily totals and 7-day trends. Think Nara Baby, scoped down.

**The build plan lives in `docs/PLAN.md`. Read it at the start of every session.**
Work phase by phase, task by task, and check boxes off as you finish them.

## Stack (decided — don't swap without asking)

- **Expo** (latest stable SDK) + **React Native** + **TypeScript** (strict mode)
- **Expo Router** (file-based routing in `app/`)
- **Convex** for backend (database, queries, mutations, live sync)
- **Clerk** for auth (`@clerk/clerk-expo` + `convex/react-clerk`)
- **date-fns** + **@date-fns/tz** for all date math
- **victory-native** (Skia-based) for charts
- **react-hook-form** + **zod** for forms
- **Vitest** + **convex-test** for backend and pure-logic tests
- Styling: `StyleSheet` + theme tokens in `src/theme/` (no CSS-in-JS libraries)

Install Expo-managed native packages with `npx expo install <pkg>`, never plain
`npm install`, so versions match the SDK.

No offline-first support. Assume network is available. Don't add sync layers
or local databases.

## Commands

```bash
npx expo start            # run the app (Expo Go or dev build)
npx convex dev            # run Convex dev deployment; regenerates convex/_generated
npm run typecheck         # tsc --noEmit
npm test                  # vitest run
npm run lint              # expo lint
```

**Before marking any task done:** `npm run typecheck && npm test && npm run lint`
must pass. If `npx convex dev` is not running, schema errors won't surface —
ask the user to start it rather than guessing.

## Directory layout

```
app/                    Expo Router routes (screens only — keep thin)
  (auth)/               sign-in / sign-up
  (app)/(tabs)/         index (Home), history, trends, settings
  (app)/log/[type].tsx  log/edit sheet for any event type (formSheet modal)
  (app)/onboarding.tsx  create household + first child
convex/                 backend: schema.ts, validators.ts, *.ts functions
  lib/                  pure, framework-free logic (time, units, aggregate) + auth helpers
src/
  components/           reusable UI
  features/<area>/      feature-specific components and hooks
  hooks/                shared hooks (useNow, useSelectedChild, useUnits)
  theme/                colors, spacing, typography tokens
docs/PLAN.md            the phased build plan
```

Pure logic (time math, unit conversion, aggregation) lives in `convex/lib/` so
both the backend and the app can import it, and so it can be unit-tested
without React or Convex.

## Non-negotiable rules

1. **Every Convex function checks access.** Use `requireUser` /
   `requireChildAccess` from `convex/lib/auth.ts`. A user may only read or write
   children in households they belong to. No exceptions, including "internal"
   convenience queries.
2. **Amounts are stored in milliliters.** Convert to oz only at the display and
   input boundary using `convex/lib/units.ts`. Never store oz.
3. **Timestamps are UTC epoch milliseconds** (`number`). "Day" boundaries are
   computed in the child's IANA time zone (`children.timezone`). Never assume a
   day is 24 hours (DST).
4. **Don't call `Date.now()` inside Convex queries** for anything that should
   change over time. Queries are cached and won't re-run as time passes. Pass
   `now` or a date string from the client.
5. **Medication: record only.** Never suggest, compute, or validate doses. The
   app may show "last given X ago" and nothing more.
6. **No `any`.** Derive types from Convex (`Doc<"events">`, `Id<"children">`,
   `Infer<typeof validator>`).
7. **Ask before** adding a dependency not listed above, changing the schema in
   a way that would need a data migration, or starting a new phase.

## Skills in this repo

Project skills live in `.claude/skills/`. Use them:

- `plan-execution` — how to pick up and complete work from `docs/PLAN.md`
- `convex-backend` — schema, function patterns, auth checks, indexes
- `event-types` — adding or changing a loggable event type end to end
- `time-and-units` — day boundaries, midnight splitting, DST, ml/oz
- `trends-and-charts` — daily summaries, 7-day series, chart components
- `mobile-ui` — screen and component conventions for a 3am-usable app
- `testing` — what to test and how (Vitest, convex-test, DST cases)
