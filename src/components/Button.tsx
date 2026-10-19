import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isPrimary = variant === 'primary';
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (pressed || inactive) && styles.dimmed,
      ]}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.colors.textOnPrimary : theme.colors.primary} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: theme.sizes.minTouchTarget + theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: { backgroundColor: theme.colors.primary },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    dimmed: { opacity: 0.6 },
    label: { ...theme.typography.bodyStrong },
    primaryLabel: { color: theme.colors.textOnPrimary },
    secondaryLabel: { color: theme.colors.primary },
  });
