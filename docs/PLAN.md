# Baby Tracker — Build Plan

Work through phases in order. Within a phase, do tasks top to bottom unless a
task says otherwise. Check off `[ ]` → `[x]` as each task is completed and
verified. **Stop at the end of each phase** and give the user a summary plus
manual test steps to run on a device before starting the next phase.

---

## Product scope (v1)

**In scope:** Five event types (feeding, sleep, pumping, medication, diaper),
per-child logging, live sync between household members, history with
edit/delete, today's totals, 7-day charts, caregiver invites, ml/oz preference.

**Out of scope for v1:** Offline mode, nursing (direct breastfeeding by side
and duration), growth charts, reminders/notifications, widgets, data export,
Apple Health / Google Fit, AI insights. These live in the Backlog at the bottom.

## Data model

All tables in `convex/schema.ts`. Event variants share common fields.

| Table | Fields | Indexes |
|---|---|---|
| `users` | `tokenIdentifier`, `name?`, `email?`, `unitPreference: "ml" \| "oz"` | `by_token` |
| `households` | `name`, `createdBy: Id<"users">` | — |
| `householdMembers` | `householdId`, `userId`, `role: "owner" \| "caregiver"` | `by_user`, `by_household`, `by_household_user` |
| `children` | `householdId`, `name`, `birthDate` (YYYY-MM-DD), `timezone` (IANA) | `by_household` |
| `invites` | `householdId`, `code`, `createdBy`, `expiresAt`, `usedBy?` | `by_code` |
| `events` | union — see below | `by_child_time`, `by_child_type_time`, `by_child_type_open` |

**Common event fields:** `childId`, `startAt` (UTC ms), `loggedBy: Id<"users">`, `notes?`

| `type` | Extra fields |
|---|---|
| `feeding` | `method: "breast_milk" \| "formula" \| "solid"`, `amountMl?`, `foodName?` (solids only) |
| `sleep` | `endAt?` (missing = timer running) |
| `pump` | `endAt?` (missing = timer running), `amountMl?` |
| `medication` | `medName`, `dose`, `doseUnit: "ml" \| "mg" \| "drops" \| "tablet"` |
| `diaper` | `wet: boolean`, `dirty: boolean` (at least one true) |

Indexes on `events`:
- `by_child_time`: `["childId", "startAt"]`. Used for the timeline and range queries.
- `by_child_type_time`: `["childId", "type", "startAt"]`. Used for "last X" lookups and per-type trends.
- `by_child_type_open`: `["childId", "type", "endAt"]`. Used to find a running timer (`endAt` undefined).

## Decisions log

Record any decision made during the build here (date, decision, reason).

- Backend is Convex, chosen for built-in live sync between caregivers. Offline is not required.
- Auth is Clerk. If Google sign-in ships on iOS, Sign in with Apple must ship too (App Store rule).
- Pumping events attach to a child for simplicity.
- Only one running timer per child per type (sleep, pump).
- 2026-10-19: Routes live in root `app/` (per CLAUDE.md), not the template's `src/app/`. Template demo code was archived to the gitignored `example/` folder instead of deleted. `AGENTS.md` updated to match.
- 2026-10-19: ESLint set up by `expo lint` (eslint 9 + eslint-config-expo); `example/` is ignored by lint and tsc.
- 2026-10-19: `@hookform/resolvers` pinned to 5.x. 6.0.0 (released 2026-10-19) has conflicting optional peer ranges for `effect`, which breaks `npm install`. 5.x supports zod 4.

---

## Phase 0 — Foundation

Goal: a signed-in user can create a household and first child and land on an empty Home tab.

- [x] **0.1 Reset template.** Run `npm run reset-project` (or remove example screens manually). Enable `"strict": true` in tsconfig. Add `typecheck`, `test`, `lint` scripts to package.json.
- [x] **0.2 Install core deps.** Use `npx expo install` for: `@clerk/clerk-expo`, `expo-secure-store`, `@react-native-community/datetimepicker`, `expo-haptics`, `@shopify/react-native-skia`, `react-native-reanimated`, `react-native-gesture-handler`. Use `npm install` for: `convex`, `date-fns`, `@date-fns/tz`, `zod`, `react-hook-form`, `@hookform/resolvers`, `victory-native`. Dev: `vitest`, `convex-test`, `@edge-runtime/vm`.
- [x] **0.3 Convex init.** User runs `npx convex dev` (needs their login). Create `convex/schema.ts` with the full data model above, and `convex/validators.ts` exporting each event variant validator and the union.
- [ ] **0.4 Clerk + Convex auth.** Create `convex/auth.config.ts`. Wrap the root layout in `ClerkProvider` (with `tokenCache`) and `ConvexProviderWithClerk`. Ask the user for the Clerk publishable key and issuer domain, and put them in `.env.local` and the Convex dashboard. Never hardcode them.
- [ ] **0.5 Users.** Add a `users.store` mutation (upsert by `tokenIdentifier`) called once after sign-in, and a `users.me` query.
- [ ] **0.6 Auth helpers.** Create `convex/lib/auth.ts` with `requireUser(ctx)`, `requireHouseholdMember(ctx, householdId)`, and `requireChildAccess(ctx, childId)`. Add tests proving a non-member is rejected.
- [ ] **0.7 Routing skeleton.** Add `(auth)` sign-in/sign-up screens (email code is fine for v1), and an `(app)` group that redirects to sign-in when signed out and to onboarding when the user has no household. Add four tabs: Home, History, Trends, Settings (placeholders).
- [ ] **0.8 Onboarding.** A single screen that creates a household and first child (name, birth date). The time zone defaults to the device zone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- [ ] **0.9 Theme.** Add `src/theme/` with light and dark tokens following the `mobile-ui` skill, and a `useTheme()` hook.

**Done when:** a fresh install can sign up, create a child, and see an empty Home tab in both light and dark mode. Signing out and back in returns to Home, not onboarding. The typecheck, test, and lint commands all pass.

---

## Phase 1 — Logging MVP

Goal: log every event type from Home, including running timers, synced live across devices.

- [ ] **1.1 Selected child.** Add a `useSelectedChild()` hook backed by React context, defaulting to the first child. Add a child switcher in the Home header that's hidden when there is only one child.
- [ ] **1.2 Event mutations** in `convex/events.ts`: `create`, `update`, `remove`, `startTimer(childId, type: "sleep" | "pump")`, and `stopTimer(eventId, endAt, amountMl?)`. `startTimer` must reject if a timer of that type is already open for the child. All mutations validate with shared validators and call `requireChildAccess`.
- [ ] **1.3 Validation rules** (server-side): `endAt > startAt`, `amountMl` must be between 0 and 1000, a diaper must have `wet || dirty`, `foodName` only appears when `method === "solid"`, and `startAt` can be no more than 5 minutes in the future.
- [ ] **1.4 Home queries.** `events.latestByType(childId)` returns the most recent event of each type. `events.openTimers(childId)` returns running sleep/pump timers.
- [ ] **1.5 Home screen.** Show a "since last" summary card (e.g. "Fed 2h 14m ago"), using a `useNow(60_000)` ticking hook. Add five large quick-log tiles. Show a running-timer banner with elapsed time and a Stop button.
- [ ] **1.6 Log sheet** `app/(app)/log/[type].tsx`, presented as a `formSheet` modal. There is one route with a form component per type in `src/features/logging/forms/`. Time defaults to now and can be adjusted. Save triggers haptic feedback and closes the sheet.
- [ ] **1.7 Per-type forms.** Feeding has a method selector and an amount in the user's unit (solids get a food name plus an optional amount). Sleep and pump offer "Start timer" or manual start/end entry, and pump adds an amount. Medication has a name with recent-meds suggestions, a dose, and a unit. Diaper has wet/dirty toggles with a "Both" shortcut.
- [ ] **1.8 Units.** Add `convex/lib/units.ts` and a `useUnits()` hook. Users can toggle ml/oz in Settings (stored on `users.unitPreference`).
- [ ] **1.9 Recent medications.** `events.recentMedications(childId)` returns distinct name/dose/unit combinations from the last 30 days for one-tap repeat.

**Done when:** every event type can be logged from Home, timers start and stop correctly, a second signed-in device sees new entries without refreshing, and the "since last" card updates each minute. Mutation validation and access checks have tests.

---

## Phase 2 — History & Editing

- [ ] **2.1 Timeline query.** `events.list(childId, types?)` uses `paginate` over `by_child_time` in descending order.
- [ ] **2.2 History screen.** A `usePaginatedQuery`-backed `FlatList` with day section headers in the child's time zone. Each row shows an icon, time, a one-line summary, and who logged it. Filter chips for event type sit at the top.
- [ ] **2.3 Edit.** Tapping a row opens the same log sheet in edit mode (`/log/[type]?id=...`), and saving calls `events.update`.
- [ ] **2.4 Delete.** Swipe or long-press to delete, with a confirmation step. Offer an undo toast that re-creates the event within 5 seconds.
- [ ] **2.5 Backdating.** Confirm the log sheet allows any past date and time, and that History orders backdated entries correctly.

**Done when:** a user can find, edit, and delete any past entry, and the list paginates smoothly past 200+ events. Seed a dev script (`convex/dev/seed.ts`, an internal mutation) that generates 30 days of realistic data.

---

## Phase 3 — Trends

Follow the `time-and-units` and `trends-and-charts` skills closely in this phase.

- [ ] **3.1 Time lib.** Add `convex/lib/time.ts` with `dayKey`, `dayRange`, `lastNDays`, and `splitIntervalByDay`. Fully test it, including DST transition days (America/Chicago on 2026-03-08 and 2026-11-01) and a non-US zone.
- [ ] **3.2 Aggregation lib.** Add `convex/lib/aggregate.ts` with a pure `summarizeDay(events, dayKey, tz, now)` that returns a `DailySummary`. Fully test it.
- [ ] **3.3 Queries.** `trends.dailySummary(childId, dayKey, now)` and `trends.weeklySeries(childId, metric, endDayKey, now)` return 7 points. Fetch from `startOfRange - 24h` so sleep that started the previous day is counted.
- [ ] **3.4 Trends screen.** Show "Today" metric cards (milk, sleep, diapers, pumped, meds). Tapping a card or using a segmented metric picker shows a 7-day bar chart. Use left/right arrows to move the 7-day window back in time.
- [ ] **3.5 Empty and partial states.** Handle days with no data (show 0 bars, not gaps), today still in progress (visually distinguish the bar), and charts that respect the unit preference.

**Done when:** totals match a hand count against the seed data, sleep spanning midnight is split correctly, and the charts look right in both themes.

---

## Phase 4 — Sharing & Multiple Children

- [ ] **4.1 Invites.** `invites.create(householdId)` generates a 6-character code valid for 48 hours, and `invites.accept(code)` adds the user as a caregiver. Codes are single-use.
- [ ] **4.2 Invite UI.** Settings → "Invite a caregiver" shows the code and a share button (`Share` API). Onboarding gains an "I have an invite code" path.
- [ ] **4.3 Members.** Settings lists household members. Owners can remove caregivers, and anyone can leave a household.
- [ ] **4.4 Children management.** Settings lets users add, rename, or edit a child, including their time zone.
- [ ] **4.5 Attribution.** History rows show the first name of whoever logged each entry (hide it when the household has only one member).

**Done when:** two accounts share a child, both see live updates, a removed caregiver immediately loses access (verify with a test), and invite codes expire.

---

## Phase 5 — Release Prep

- [ ] **5.1 Account deletion.** Add an in-app delete-account flow (required by the App Store). It deletes the user's memberships, deletes households and events where they are the sole member, and deletes the Clerk user.
- [ ] **5.2 EAS.** Add `eas.json` with development, preview, and production profiles, and set the app name, bundle identifier, icon, and splash screen.
- [ ] **5.3 Error handling.** Show friendly error toasts for failed mutations, add an error boundary per tab, and add a connection-lost banner.
- [ ] **5.4 Accessibility pass.** Add labels on all icon buttons, support Dynamic Type up to the largest size, and check contrast.
- [ ] **5.5 Privacy.** Draft a privacy policy page (baby health data!) and complete the App Store and Play Store data-safety forms with the user.

**Done when:** a TestFlight / internal-track build installs and passes a full manual run-through.

---

## Backlog (do not start without the user's go-ahead)

- Nursing event (side + duration timer), added via the `event-types` skill
- Reminders ("next feed in ~30 min") with `expo-notifications`
- Home-screen widgets / iOS Live Activity for running timers
- CSV/PDF export for pediatrician visits
- Growth tracking (weight, length, head circumference)
- Apple Health integration
