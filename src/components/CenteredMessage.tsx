import { useMemo, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = {
  title?: string;
  body?: string;
  /** Shows a spinner instead of a title when true. */
  loading?: boolean;
  children?: ReactNode;
};

/** Full-screen loading, empty, or error state. */
export function CenteredMessage({ title, body, loading = false, children }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel="Loading" />
      ) : null}
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {children}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.background,
    },
    title: { ...theme.typography.title, color: theme.colors.text, textAlign: 'center' },
    body: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
  });
