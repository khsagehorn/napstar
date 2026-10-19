import { useAuth } from '@clerk/clerk-expo';

import { Button } from '@/components/Button';
import { CenteredMessage } from '@/components/CenteredMessage';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  return (
    <CenteredMessage title="Settings" body="More settings are coming soon.">
      <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
    </CenteredMessage>
  );
}
