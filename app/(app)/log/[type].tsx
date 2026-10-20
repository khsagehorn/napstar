import { useLocalSearchParams } from 'expo-router';

import { CenteredMessage } from '@/components/CenteredMessage';
import { isEventType } from '@/features/events/meta';
import { LogSheet } from '@/features/logging/LogSheet';

export default function LogRoute() {
  const { type } = useLocalSearchParams<{ type: string }>();
  if (!isEventType(type)) {
    return <CenteredMessage title="Unknown entry type" body="Close this sheet and try again." />;
  }
  return <LogSheet type={type} />;
}
