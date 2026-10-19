import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CenteredMessage } from '@/components/CenteredMessage';
import { Screen } from '@/components/Screen';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { useTheme, type Theme } from '@/theme';

import { ChildSwitcher } from './ChildSwitcher';

export function HomeScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { children, child } = useSelectedChild();

  if (children === undefined) return <CenteredMessage loading />;
  if (!child) {
    return <CenteredMessage title="No children yet" body="Add a child in Settings to start logging." />;
  }

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {child.name}
        </Text>
        <ChildSwitcher />
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Nothing logged yet</Text>
        <Text style={styles.emptyBody}>
          Feedings, sleep, and diapers you log will show up here.
        </Text>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    header: { gap: theme.spacing.md },
    title: { ...theme.typography.largeTitle, color: theme.colors.text },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
    emptyTitle: { ...theme.typography.title, color: theme.colors.text, textAlign: 'center' },
    emptyBody: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
  });
