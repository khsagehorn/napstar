---
name: convex-backend
description: Conventions for the Convex backend in this baby tracker — schema, validators, queries, mutations, access control, indexes, and pagination. Use this whenever you create or edit anything in convex/, add a query or mutation, touch the schema, wire up useQuery/useMutation in the app, or debug a Convex error, even for small changes.
---

# Convex backend conventions

Check current Convex docs if an API below doesn't match what's installed.
Convex evolves, and the installed version wins.

## File layout

```
convex/
  schema.ts         tables + indexes (imports variant validators from validators.ts)
  validators.ts     shared validators: one per event variant + the union
  auth.config.ts    Clerk issuer config
  users.ts          store, me, setUnitPreference
  households.ts     create, mine, members, removeMember, leave
  children.ts       create, list, update
  events.ts         create, update, remove, startTimer, stopTimer, list, latestByType, openTimers, recentMedications
  trends.ts         dailySummary, weeklySeries
  invites.ts        create, accept
  lib/auth.ts       requireUser, requireHouseholdMember, requireChildAccess
  lib/time.ts, lib/units.ts, lib/aggregate.ts   pure logic (see time-and-units)
  dev/seed.ts       internalMutation for seed data
```

## Validators: define once, reuse everywhere

Event variants are defined once in `validators.ts`. The schema, mutation args,
and client types all derive from them, so a field added in one place can't
silently be missing from another.

```ts
// convex/validators.ts
import { v, Infer } from "convex/values";

const common = {
  childId: v.id("children"),
  startAt: v.number(),
  loggedBy: v.id("users"),
  notes: v.optional(v.string()),
};

export const feedingEvent = v.object({
  ...common,
  type: v.literal("feeding"),
  method: v.union(v.literal("breast_milk"), v.literal("formula"), v.literal("solid")),
  amountMl: v.optional(v.number()),
  foodName: v.optional(v.string()),
});
// ...sleepEvent, pumpEvent, medicationEvent, diaperEvent

export const eventDoc = v.union(feedingEvent, sleepEvent, pumpEvent, medicationEvent, diaperEvent);
export type EventInput = Infer<typeof eventDoc>;
```

Client-supplied args must **not** include `loggedBy`. The server sets it from
the authenticated user. Build arg validators without that field (e.g. a
`withoutLoggedBy` helper or separate `*Input` validators).

## Access control: every function, every time

```ts
// convex/lib/auth.ts
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not signed in");
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError("User not found");
  return user;
}

export async function requireChildAccess(ctx: QueryCtx | MutationCtx, childId: Id<"children">) {
  const user = await requireUser(ctx);
  const child = await ctx.db.get(childId);
  if (!child) throw new ConvexError("Child not found");
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_household_user", (q) => q.eq("householdId", child.householdId).eq("userId", user._id))
    .unique();
  if (!membership) throw new ConvexError("No access");
  return { user, child, membership };
}
```

For mutations on an existing event (`update`, `remove`, `stopTimer`), load the
event first and then call `requireChildAccess(ctx, event.childId)`. Never trust a
`childId` passed alongside an `eventId`. On `update`, also forbid changing
`childId` or `type`.

Use `ConvexError` for user-facing errors so the client can show the message.

## Queries

- **Always use an index.** Use `.withIndex(...)`, never `.filter()` over a whole
  table. `.filter()` after a narrow index range is fine.
- Use the right index for the job. The timeline and date ranges use `by_child_time`.
  "Latest feeding" and per-type ranges use `by_child_type_time` with `.order("desc").first()`.
  A running timer uses `by_child_type_open` with `.eq("endAt", undefined)`.
- Use `.paginate(paginationOpts)` for the History list and `.take(n)` for bounded
  lookups. Avoid `.collect()` on anything that grows without bound, except range
  queries bounded to a few days (trends).
- **No `Date.now()` in queries** for time-dependent results. Queries are cached
  and reactive to data changes only, not the clock. Accept `now: v.number()`
  or a `dayKey` from the client.

## Mutations

- Validate business rules server-side even if the form also validates (see
  PLAN task 1.3). Clients can be stale or buggy.
- `startTimer` checks `by_child_type_open` for an existing open timer and throws
  if one exists. Mutations are transactional, so this check is race-safe.
- Return the new document's `_id` from `create` so the UI can offer undo or edit.

## Client wiring

```tsx
const latest = useQuery(api.events.latestByType, child ? { childId: child._id } : "skip");
const createEvent = useMutation(api.events.create);
```

- `undefined` from `useQuery` means loading. Render a skeleton, not an empty state.
- Pass `"skip"` when required args aren't ready yet.
- Wrap mutation calls in try/catch and surface `ConvexError` data in a toast.
- Optimistic updates are optional. Convex round-trips are fast. Add them only
  where the UI feels laggy (e.g. stopping a timer).
