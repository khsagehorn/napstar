import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';

import { CenteredMessage } from '@/components/CenteredMessage';

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <CenteredMessage loading />;
  if (isSignedIn) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
