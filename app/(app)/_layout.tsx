import { useAuth } from '@clerk/clerk-expo';
import { useConvexAuth, useQuery } from 'convex/react';
import { Redirect, Stack } from 'expo-router';

import { Button } from '@/components/Button';
import { CenteredMessage } from '@/components/CenteredMessage';
import { SelectedChildProvider } from '@/hooks/useSelectedChild';
import { useStoreUser } from '@/hooks/useStoreUser';

import { api } from '../../convex/_generated/api';

/**
 * Auth gate: signed out → sign-in; signed in without a household →
 * onboarding; otherwise the tabs.
 */
export default function AppLayout() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { isLoading: convexAuthLoading, isAuthenticated } = useConvexAuth();
  const storedUser = useStoreUser();
  const households = useQuery(
    api.households.mine,
    storedUser.status === 'stored' ? {} : 'skip',
  );

  if (!isLoaded) return <CenteredMessage loading />;
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  // Signed in with Clerk, but Convex rejected the token (usually a missing
  // Convex integration / JWT template in Clerk, or a wrong issuer domain).
  const convexRejected = !convexAuthLoading && !isAuthenticated;
  if (convexRejected || storedUser.status === 'error') {
    return (
      <CenteredMessage
        title="Couldn't connect your account"
        body={
          storedUser.status === 'error'
            ? storedUser.message
            : 'The server did not accept your sign-in. Please try signing in again.'
        }>
        <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
      </CenteredMessage>
    );
  }

  if (households === undefined) return <CenteredMessage loading />;

  const hasHousehold = households.length > 0;
  return (
    <SelectedChildProvider enabled={hasHousehold}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={hasHousehold}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="log/[type]" options={{ presentation: 'formSheet' }} />
        </Stack.Protected>
        <Stack.Protected guard={!hasHousehold}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </SelectedChildProvider>
  );
}
