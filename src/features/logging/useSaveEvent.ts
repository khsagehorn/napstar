import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/lib/errors';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { eventRuleError } from '../../../convex/lib/validation';
import type { EventInput, TimerType } from '../../../convex/validators';

/**
 * Saving from a log sheet. On success: success haptic, then close the sheet.
 * On failure the sheet stays open with the message in `error`.
 */
export function useSaveEvent() {
  const create = useMutation(api.events.create);
  const start = useMutation(api.events.startTimer);
  const router = useRouter();
  const [error, setError] = useState<string>();

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  /** Creates `event`, checking the shared rules first for instant feedback. */
  const save = async (event: EventInput) => {
    setError(undefined);
    const ruleError = eventRuleError(event, Date.now());
    if (ruleError) {
      setError(ruleError);
      return;
    }
    await run(() => create({ event }));
  };

  /** Starts a sleep or pump timer now. */
  const startTimer = async (childId: Id<'children'>, type: TimerType) => {
    setError(undefined);
    await run(() => start({ childId, type }));
  };

  return { save, startTimer, error };
}

/** A form's time value (`null` = now) as UTC ms, resolved at save time. */
export const resolveTime = (time: Date | null) => (time ?? new Date()).getTime();
