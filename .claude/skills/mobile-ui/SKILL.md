---
name: mobile-ui
description: Screen, component, navigation, and styling conventions for the baby tracker's React Native / Expo Router UI, designed for one-handed use by exhausted parents at night. Use this whenever you create or modify a screen, component, form, modal/sheet, theme token, or navigation route in app/ or src/, including small visual tweaks.
---

# Mobile UI conventions

The core user is holding a baby in one arm, in a dark room, at 3am, half asleep.
Every design decision should make logging faster and harder to get wrong under
those conditions.

## Design principles

- **Two taps to log** the common case: tap a tile, then tap Save. Defaults (time = now,
  last-used feeding method and amount, last diaper type) do the rest.
- **Big targets.** Primary tiles are at least 88pt tall, and any tappable element is at least
  48×48pt. Put primary actions in the lower half of the screen where a thumb reaches.
- **Dark mode is first-class**, not an afterthought. Use a low-glare dark palette
  (no pure white text on pure black; use soft off-whites on charcoal).
- **Forgiving.** Everything is editable and deletable, and deletes offer undo. Never
  block saving on optional fields.
- **Glanceable.** The Home summary card answers "when did they last eat/sleep/poop?"
  without any interaction.

## Theme

```
src/theme/
  tokens.ts     colors (light + dark), spacing scale (4, 8, 12, 16, 24, 32), radii, type scale
  useTheme.ts   picks palette from useColorScheme()
```

- Each event type has a color token (`feeding`, `sleep`, `pump`, `medication`,
  `diaper`) used consistently on tiles, History icons, and charts.
- Never put hex values in components. Always use tokens.
- Use `StyleSheet.create` with theme values passed in, e.g. a
  `makeStyles(theme)` pattern or `useMemo`. Don't add a styling library.

## Navigation (Expo Router)

- `app/_layout.tsx` holds the providers (Clerk, Convex, theme, selected child) and nothing else.
- `app/(app)/_layout.tsx` is the auth gate. It redirects to `(auth)` when signed
  out and to `onboarding` when the user has no household.
- `app/(app)/(tabs)/` contains Home, History, Trends, and Settings.
- `app/(app)/log/[type].tsx` is registered with `presentation: "formSheet"`
  (sheet detents if supported). Its params are `type` plus an optional `id` for edit mode.
  Validate `type` against the event-type union and show an error screen for bad values.
- Keep route files thin. They read params and render a feature component from `src/features/`.

## Forms

- Use react-hook-form + zod. The zod schema mirrors the server rules, but the server
  remains the authority.
- Use segmented controls or large chips for small choices (method, diaper type,
  dose unit). Avoid dropdowns.
- Use numeric keypads (`keyboardType="decimal-pad"`) for amounts, with quick-pick chips
  for common values (e.g. 2, 3, 4, 5, 6 oz, or the ml equivalents).
- The time field shows "Now" by default, and tapping it opens
  `@react-native-community/datetimepicker`.
- Wrap form content in `KeyboardAvoidingView` / a scroll view so the keyboard
  never hides the Save button. Verify this on a small device.
- On success, fire `Haptics.notificationAsync(Success)`, close the sheet, and
  show a brief toast. On failure, keep the sheet open and show the `ConvexError` message.

## Loading, empty, and error states

- `useQuery` returning `undefined` means loading, so show a skeleton.
- An empty result means the user hasn't logged anything yet, so show friendly copy
  with a call to action ("No feedings logged yet — tap Feed to add one").
- Give each tab its own error boundary, so one crashing screen doesn't take
  down the app.

## Accessibility

- Every icon-only button has an `accessibilityLabel`.
- Text uses the type scale and respects Dynamic Type. Test with the largest
  accessibility size and make sure layouts wrap instead of clipping.
- Color is never the only signal. Pair event colors with icons and labels.
