import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

import { ToggleChip } from './ToggleChip';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accent for the selected chip. */
  color?: string;
};

/** A single-choice row of large chips, used instead of dropdowns. */
export function ChoiceChips<T extends string>({ label, options, value, onChange, color }: Props<T>) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => (
          <ToggleChip
            key={option.value}
            role="radio"
            label={option.label}
            selected={option.value === value}
            color={color}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.xs },
    label: { ...theme.typography.caption, color: theme.colors.textMuted },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  });
