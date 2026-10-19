---
name: event-types
description: Checklist for adding a new loggable event type (e.g. nursing, growth, temperature) or adding/changing a field on an existing one (feeding, sleep, pump, medication, diaper) in the baby tracker. Use this whenever the user asks to track something new, add a field to a log form, rename an event option, or change what an event stores — these changes touch many files and are easy to leave half-done.
---

# Adding or changing an event type

An event type lives in about eight places. Missing one produces bugs that the
type checker may not catch (e.g. a History row that renders blank, or a trend that
silently ignores the new type). Work through the whole list.

## Checklist

1. **Validator.** In `convex/validators.ts`, add or modify the variant and add it to
   the `eventDoc` union. New fields on existing types must be `v.optional(...)`
   unless you've agreed a data migration with the user. Existing documents
   won't have the field and the schema push will fail.
2. **Schema.** `convex/schema.ts` picks up the union automatically. Confirm the
   indexes still make sense (every variant needs `childId` and `startAt`).
3. **Server validation.** In `convex/events.ts`, add business rules for the
   new fields to the shared `assertValidEvent()` used by `create` and `update`.
   Add tests for each rule.
4. **Form.** Add or modify `src/features/logging/forms/<Type>Form.tsx` with a
   zod schema mirroring the server rules. Register it in the form map used by
   `app/(app)/log/[type].tsx`. Amounts go through `useUnits()` (see `time-and-units`).
5. **Home tile and "since last".** Update the tile list (icon, label, color token)
   and the `latestByType` query and summary card.
6. **History row.** Update `src/features/history/eventSummary.ts`, the function
   that turns an event into a one-line description. Use a `switch (event.type)`
   with an exhaustive `never` check so new types fail to compile until handled:
   ```ts
   default: {
     const _exhaustive: never = event;
     return _exhaustive;
   }
   ```
7. **Filters.** Add the type to the History filter chips.
8. **Trends.** If the type has a meaningful daily metric, extend `DailySummary`
   in `convex/lib/aggregate.ts`, the metric list in `trends.weeklySeries`, and
   the Trends screen. Add aggregation tests.
9. **Seed data.** Update `convex/dev/seed.ts` so new types show up in dev.
10. **Plan.** Add a Decisions log entry describing the change.

## Design guidance for new fields

- Prefer **booleans or small literal unions** over free text when there's a fixed
  set (the diaper type uses `wet`/`dirty` booleans so "both" is natural).
- Anything that's a duration is `startAt` + `endAt`. Never store a duration
  number, because it can't be split across midnight.
- Volumes are always `amountMl`. Weights, if added, are always grams.
- Medication-like fields record what happened. Never add fields or logic that
  recommend, calculate, or validate a dose.

## Example: adding nursing (backlog item)

The `nursing` variant has the common fields plus `endAt?` (timer) and
`side: "left" | "right" | "both"`. It reuses the timer flow from sleep and
pump, so extend `startTimer`'s `type` arg and the `by_child_type_open` lookup. For
trends, count sessions and total duration, but don't add it to milk volume.
