import type { TextStyle } from 'react-native';

import type { EventType } from '../../convex/validators';

// All colors, spacing, radii, and type sizes live here. Components never use
// raw hex values or magic numbers; they read these through `useTheme()`.

type EventColors = Record<EventType, string>;

export type Palette = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  primary: string;
  danger: string;
  success: string;
  /** Accent per event type, used on tiles, History icons, and charts. */
  events: EventColors;
};

const light: Palette = {
  background: '#F6F4F0',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#E2DDD5',
  text: '#1E2228',
  textMuted: '#5A616D',
  textOnPrimary: '#FFFFFF',
  primary: '#3A63C9',
  danger: '#C2413B',
  success: '#2E7D4F',
  // Each accent is ≥4.5:1 on both background and surface.
  events: {
    feeding: '#A65C17',
    sleep: '#5B5FC7',
    pump: '#B0407A',
    medication: '#1E7272',
    diaper: '#57721A',
  },
};

// Low-glare night palette: soft off-white text on charcoal, never pure white
// on pure black, and slightly desaturated accents.
const dark: Palette = {
  background: '#14161A',
  surface: '#1D2026',
  surfaceRaised: '#252931',
  border: '#30353E',
  text: '#E4E0D8',
  textMuted: '#A2A6AF',
  textOnPrimary: '#14161A',
  primary: '#8EA9EC',
  danger: '#E88A84',
  success: '#7CC79A',
  events: {
    feeding: '#E3A465',
    sleep: '#9A9DE6',
    pump: '#DC8FB6',
    medication: '#6FC0BF',
    diaper: '#AFC872',
  },
};

export const palettes = { light, dark } as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

/** Minimum sizes for one-handed use (see mobile-ui skill). */
export const sizes = {
  minTouchTarget: 48,
  tileMinHeight: 88,
} as const;

export const typography = {
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  largeTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
} as const satisfies Record<string, TextStyle>;

export type ColorSchemeName = keyof typeof palettes;

export type Theme = {
  scheme: ColorSchemeName;
  colors: Palette;
  spacing: typeof spacing;
  radii: typeof radii;
  sizes: typeof sizes;
  typography: typeof typography;
};

export function makeTheme(scheme: ColorSchemeName): Theme {
  return { scheme, colors: palettes[scheme], spacing, radii, sizes, typography };
}
