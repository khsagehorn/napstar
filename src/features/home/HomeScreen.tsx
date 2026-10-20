import { useQuery } from 'convex/react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CenteredMessage } from '@/components/CenteredMessage';
import { Screen } from '@/components/Screen';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { useTheme, type Theme } from '@/theme';

import { api } from '../../../convex/_generated/api';
import { ChildSwitcher } from './ChildSwitcher';
import { QuickLogTiles } from './QuickLogTiles';
import { SinceLastCard } from './SinceLastCard';
import { TimerBanner } from './TimerBanner';

export function HomeScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { children, child } = useSelectedChild();
  const args = child ? { childId: child._id } : 'skip';
  const latest = useQuery(api.events.latestByType, args);
  const timers = useQuery(api.events.openTimers, args);

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
      {timers?.sleep ? <TimerBanner timer={timers.sleep} /> : null}
      {timers?.pump ? <TimerBanner timer={timers.pump} /> : null}
      <SinceLastCard latest={latest} />
      {/* Pushed to the bottom of the screen, where a thumb reaches. */}
      <View style={styles.tiles}>
        <QuickLogTiles />
      </View>
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    header: { gap: theme.spacing.md },
    title: { ...theme.typography.largeTitle, color: theme.colors.text },
    tiles: { marginTop: 'auto' },
  });
