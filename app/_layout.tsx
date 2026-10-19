import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { toNavigationTheme, useTheme } from '@/theme';

export default function RootLayout() {
  const theme = useTheme();
  return (
    <ThemeProvider value={toNavigationTheme(theme)}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack />
    </ThemeProvider>
  );
}
