import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { TextField } from '@/components/TextField';
import { useTheme, type Theme } from '@/theme';

import { parseDecimal, toMl, type VolumeUnit } from '../../../convex/lib/units';

const QUICK_PICKS: Record<VolumeUnit, number[]> = {
  oz: [2, 3, 4, 5, 6],
  ml: [60, 90, 120, 150, 180],
};

/** Zod rule for an optional amount typed as text in the user's unit. */
export const amountText = z
  .string()
  .trim()
  .refine((text) => text === '' || parseDecimal(text) !== null, 'Enter a number, like 4 or 4.5');

/** Typed amount (in `unit`) → ml for storage, or undefined when left blank. */
export function amountToMl(text: string, unit: VolumeUnit): number | undefined {
  const value = parseDecimal(text);
  return value === null ? undefined : toMl(value, unit);
}

type Props = {
  label: string;
  unit: VolumeUnit;
  value: string;
  onChange: (text: string) => void;
  onBlur?: () => void;
  error?: string;
};

/** A numeric amount in the user's unit, with quick-pick chips for common values. */
export function AmountField({ label, unit, value, onChange, onBlur, error }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const current = parseDecimal(value);

  return (
    <View style={styles.container}>
      <TextField
        label={`${label} (${unit})`}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        keyboardType="decimal-pad"
        placeholder={unit}
        error={error}
      />
      <View style={styles.chips}>
        {QUICK_PICKS[unit].map((n) => {
          const selected = current === n;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${n} ${unit}`}
              onPress={() => onChange(String(n))}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.sm },
    chips: { flexDirection: 'row', gap: theme.spacing.sm },
    chip: {
      flex: 1,
      minHeight: theme.sizes.minTouchTarget,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    pressed: { opacity: 0.6 },
    chipLabel: { ...theme.typography.bodyStrong, color: theme.colors.text },
    chipLabelSelected: { color: theme.colors.textOnPrimary },
  });
