import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useTheme, type Theme } from '@/theme';

type Props = {
  title: string;
  children: ReactNode;
  /** Server or rule error, shown above Save. */
  error?: string;
  saving: boolean;
  onSave: () => void;
};

/** Shared frame for every log form: title, fields, error, and a Save button. */
export function LogFormLayout({ title, children, error, saving, onSave }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Screen edges={['bottom']}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {children}
      <View style={styles.footer}>
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button title="Save" onPress={onSave} loading={saving} />
      </View>
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    title: { ...theme.typography.title, color: theme.colors.text },
    footer: { marginTop: 'auto', gap: theme.spacing.md },
    error: { ...theme.typography.body, color: theme.colors.danger },
  });
