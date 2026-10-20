import { CenteredMessage } from '@/components/CenteredMessage';
import { useSelectedChild } from '@/hooks/useSelectedChild';

import type { EventType } from '../../../convex/validators';
import { DiaperForm } from './forms/DiaperForm';
import { FeedingForm } from './forms/FeedingForm';
import { MedicationForm } from './forms/MedicationForm';
import { TimedForm } from './forms/TimedForm';

type Props = { type: EventType };

/** Picks the form for `type`, logging for the selected child. */
export function LogSheet({ type }: Props) {
  const { children, child } = useSelectedChild();
  if (children === undefined) return <CenteredMessage loading />;
  if (!child) return <CenteredMessage title="No child selected" />;

  switch (type) {
    case 'feeding':
      return <FeedingForm childId={child._id} />;
    case 'sleep':
    case 'pump':
      return <TimedForm childId={child._id} type={type} />;
    case 'medication':
      return <MedicationForm childId={child._id} />;
    case 'diaper':
      return <DiaperForm childId={child._id} />;
  }
}
