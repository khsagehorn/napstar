import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/lib/errors';

import { api } from '../../../convex/_generated/api';
import { eventRuleError } from '../../../convex/lib/validation';
import type { EventInput } from '../../../convex/validators';

/**
 * Saves a new event: checks the shared rules for instant feedback, then
 * creates it, fires a success haptic, and closes the sheet. On failure the
 * sheet stays open with the message in `error`.
 */
export function useSaveEvent() {
  const create = useMutation(api.events.create);
  const router = useRouter();
  const [error, setError] = useState<string>();

  const save = async (event: EventInput) => {
    setError(undefined);
    const ruleError = eventRuleError(event, Date.now());
    if (ruleError) {
      setError(ruleError);
      return;
    }
    try {
      await create({ event });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return { save, error };
}

/** A form's time value (`null` = now) as UTC ms, resolved at save time. */
export const resolveTime = (time: Date | null) => (time ?? new Date()).getTime();
