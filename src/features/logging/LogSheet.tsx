import { CenteredMessage } from '@/components/CenteredMessage';
import { EVENT_META } from '@/features/events/meta';
import { useSelectedChild } from '@/hooks/useSelectedChild';

import type { EventType } from '../../../convex/validators';
import { DiaperForm } from './forms/DiaperForm';

type Props = { type: EventType };

/** Picks the form for `type`, logging for the selected child. */
export function LogSheet({ type }: Props) {
  const { children, child } = useSelectedChild();
  if (children === undefined) return <CenteredMessage loading />;
  if (!child) return <CenteredMessage title="No child selected" />;

  switch (type) {
    case 'diaper':
      return <DiaperForm childId={child._id} />;
    default:
      // Task 1.7 adds the feeding, sleep, pump, and medication forms.
      return <CenteredMessage title={EVENT_META[type].label} body="This form is coming next." />;
  }
}
