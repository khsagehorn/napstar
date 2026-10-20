import { useLocalSearchParams } from 'expo-router';

import { CenteredMessage } from '@/components/CenteredMessage';
import { EVENT_META, isEventType } from '@/features/events/meta';

// Placeholder so the Home tiles have a destination; task 1.6 replaces it
// with the real log sheet.
export default function LogRoute() {
  const { type } = useLocalSearchParams<{ type: string }>();
  if (!isEventType(type)) {
    return <CenteredMessage title="Unknown entry type" body="Close this sheet and try again." />;
  }
  return <CenteredMessage title={EVENT_META[type].label} body="The log form is coming next." />;
}
