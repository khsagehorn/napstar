import type { SymbolViewProps } from 'expo-symbols';

import type { EventType } from '../../../convex/validators';

type EventMeta = {
  /** Short action label for tiles ("Feed"). */
  label: string;
  /** Icon, paired with the event color and label so color is never the only signal. */
  symbol: SymbolViewProps['name'];
};

/** Display metadata per event type, in Home tile order. */
export const EVENT_META: Record<EventType, EventMeta> = {
  feeding: { label: 'Feed', symbol: { ios: 'waterbottle.fill', android: 'local_drink' } },
  sleep: { label: 'Sleep', symbol: { ios: 'moon.zzz.fill', android: 'bedtime' } },
  pump: { label: 'Pump', symbol: { ios: 'drop.fill', android: 'water_drop' } },
  medication: { label: 'Meds', symbol: { ios: 'pills.fill', android: 'medication' } },
  diaper: { label: 'Diaper', symbol: { ios: 'sparkles', android: 'baby_changing_station' } },
};

export const EVENT_TYPES = Object.keys(EVENT_META) as EventType[];

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && Object.hasOwn(EVENT_META, value);
}
