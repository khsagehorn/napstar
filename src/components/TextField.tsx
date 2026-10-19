import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, ...inputProps }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.xs },
    label: { ...theme.typography.caption, color: theme.colors.textMuted },
    input: {
      ...theme.typography.body,
      minHeight: theme.sizes.minTouchTarget + theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
    inputError: { borderColor: theme.colors.danger },
    error: { ...theme.typography.caption, color: theme.colors.danger },
  });
