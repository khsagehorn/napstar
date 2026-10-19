---
name: plan-execution
description: How to pick up, implement, verify, and record work from docs/PLAN.md for the baby tracker app. Use this at the start of any session, whenever the user says "continue", "next task", "start phase N", "what's left", or asks you to build any feature that appears in the plan — even if they don't mention the plan by name.
---

# Executing the build plan

`docs/PLAN.md` is the source of truth for what to build and in what order. The
user is relying on you to do most of the implementation, so the plan's
checkboxes are how they track progress between sessions. Keep them accurate.

## Starting a session

1. Read `docs/PLAN.md`. Find the current phase: the first phase with unchecked tasks.
2. Skim the "Decisions log" so you don't relitigate settled choices.
3. Run `git status` and `git log --oneline -10` to see where things were left.
   If there's uncommitted work, ask the user before discarding or continuing it.
4. Tell the user in one or two lines which task you're picking up next.

## Doing a task

1. **Load the relevant skills first.** Backend work uses `convex-backend`. Anything
   with dates or amounts uses `time-and-units`. Screens use `mobile-ui`. Event
   type changes use `event-types`. Trends work uses `trends-and-charts`.
2. **Stay inside the task.** If you notice something worth doing that belongs to
   a later task or phase, write it down in your summary instead of doing it. Scope
   creep across phases makes the user's device testing unreliable.
3. **Write tests alongside the code** for anything in `convex/` (see `testing`).
4. **Verify:** `npm run typecheck && npm test && npm run lint`. Fix failures
   rather than skipping or loosening checks. Never add `// @ts-ignore`, `any`, or
   `.skip` to get green.
5. **Check the box** in `docs/PLAN.md` only after verification passes.
6. **Commit** with a message like `feat(logging): add diaper form (1.7)` that
   references the task number. One task per commit where practical.

## When the plan is unclear or wrong

- If a task is ambiguous, ask a short, specific question with a suggested default.
- If you make a judgement call, add a dated line to the "Decisions log".
- If the plan conflicts with how a library actually works today (APIs change),
  check current docs, follow the library, and note the deviation in the
  Decisions log.
- If a change needs a new dependency or a schema change that would require
  migrating existing data, stop and ask. CLAUDE.md lists this as a rule.

## Ending a phase

When the last task in a phase is checked:

1. Run the full verification once more.
2. Give the user a short summary of what was built, plus a numbered **manual
   test script** that walks through each "Done when" criterion on a real device.
3. **Stop.** Do not start the next phase until the user confirms the manual test
   passed. Device testing catches things the type checker never will (keyboard
   covering inputs, timers drifting, dark mode contrast).
