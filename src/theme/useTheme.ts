import { useColorScheme } from 'react-native';

import { makeTheme, type Theme } from './tokens';

const lightTheme = makeTheme('light');
const darkTheme = makeTheme('dark');

/** The current theme, following the device's light/dark setting. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
