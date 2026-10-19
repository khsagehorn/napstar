import { v, type Infer } from 'convex/values';

// Event variants are defined once here. The schema, mutation args, and client
// types all derive from these so a field can't drift between layers.

export const unitPreference = v.union(v.literal('ml'), v.literal('oz'));
export const memberRole = v.union(v.literal('owner'), v.literal('caregiver'));

export const feedingMethod = v.union(
  v.literal('breast_milk'),
  v.literal('formula'),
  v.literal('solid'),
);
/** Event types that run as a start/stop timer. */
export const timerType = v.union(v.literal('sleep'), v.literal('pump'));
export const doseUnit = v.union(
  v.literal('ml'),
  v.literal('mg'),
  v.literal('drops'),
  v.literal('tablet'),
);

// Fields the client may supply. `loggedBy` is deliberately absent: the server
// sets it from the authenticated user.
const commonInputFields = {
  childId: v.id('children'),
  startAt: v.number(), // UTC epoch ms
  notes: v.optional(v.string()),
};

const commonFields = {
  ...commonInputFields,
  loggedBy: v.id('users'),
};

export const feedingFields = {
  type: v.literal('feeding'),
  method: feedingMethod,
  amountMl: v.optional(v.number()),
  foodName: v.optional(v.string()), // solids only
};

export const sleepFields = {
  type: v.literal('sleep'),
  endAt: v.optional(v.number()), // missing = timer running
};

export const pumpFields = {
  type: v.literal('pump'),
  endAt: v.optional(v.number()), // missing = timer running
  amountMl: v.optional(v.number()),
};

export const medicationFields = {
  type: v.literal('medication'),
  medName: v.string(),
  dose: v.string(),
  doseUnit,
};

export const diaperFields = {
  type: v.literal('diaper'),
  wet: v.boolean(),
  dirty: v.boolean(),
};

export const feedingEvent = v.object({ ...commonFields, ...feedingFields });
export const sleepEvent = v.object({ ...commonFields, ...sleepFields });
export const pumpEvent = v.object({ ...commonFields, ...pumpFields });
export const medicationEvent = v.object({ ...commonFields, ...medicationFields });
export const diaperEvent = v.object({ ...commonFields, ...diaperFields });

export const eventDoc = v.union(
  feedingEvent,
  sleepEvent,
  pumpEvent,
  medicationEvent,
  diaperEvent,
);

export const eventInput = v.union(
  v.object({ ...commonInputFields, ...feedingFields }),
  v.object({ ...commonInputFields, ...sleepFields }),
  v.object({ ...commonInputFields, ...pumpFields }),
  v.object({ ...commonInputFields, ...medicationFields }),
  v.object({ ...commonInputFields, ...diaperFields }),
);

export type EventFields = Infer<typeof eventDoc>;
export type EventInput = Infer<typeof eventInput>;
export type EventType = EventFields['type'];
export type TimerType = Infer<typeof timerType>;
export type UnitPreference = Infer<typeof unitPreference>;
