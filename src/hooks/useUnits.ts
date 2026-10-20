import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';
import type { VolumeUnit } from '../../convex/lib/units';

/** The signed-in user's volume unit. `undefined` while loading. */
export function useUnits(): VolumeUnit | undefined {
  const me = useQuery(api.users.me);
  return me?.unitPreference;
}
