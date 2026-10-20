import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Accent when selected; defaults to the primary color. */
  color?: string;
};

/** A large on/off chip for small choices (diaper type, feeding method, dose unit). */
export function ToggleChip({ label, selected, onPress, color }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const accent = color ?? theme.colors.primary;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: accent, borderColor: accent },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    chip: {
      flexGrow: 1,
      minHeight: theme.sizes.minTouchTarget + theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.6 },
    label: { ...theme.typography.bodyStrong, color: theme.colors.text },
    labelSelected: { color: theme.colors.textOnPrimary },
  });
