import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { convex } from '@/lib/convex';
import { toNavigationTheme, useTheme } from '@/theme';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set in .env.local.');
}

export default function RootLayout() {
  const theme = useTheme();
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ThemeProvider value={toNavigationTheme(theme)}>
          <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
          <Stack />
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
