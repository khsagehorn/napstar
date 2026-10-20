import type { FunctionReturnType } from 'convex/server';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EVENT_META } from '@/features/events/meta';
import { useNow } from '@/hooks/useNow';
import { useTheme, type Theme } from '@/theme';

import type { api } from '../../../convex/_generated/api';
import { formatAgo, formatDuration } from '../../../convex/lib/time';
import type { EventType } from '../../../convex/validators';

type Latest = FunctionReturnType<typeof api.events.latestByType>;

type Row = { type: EventType; title: string; value: string; detail?: string };

const FEEDING_METHOD = { breast_milk: 'Breast milk', formula: 'Formula', solid: 'Solids' } as const;

function diaperDetail(wet: boolean, dirty: boolean) {
  if (wet && dirty) return 'Wet + dirty';
  return wet ? 'Wet' : 'Dirty';
}

/** One line per event type answering "when did they last…?". */
function buildRows(latest: Latest, now: number): Row[] {
  const { feeding, sleep, pump, medication, diaper } = latest;
  const none = 'Not logged yet';
  return [
    {
      type: 'feeding',
      title: 'Last feed',
      value: feeding ? formatAgo(now - feeding.startAt) : none,
      detail: feeding
        ? [FEEDING_METHOD[feeding.method], feeding.foodName].filter(Boolean).join(' · ')
        : undefined,
    },
    sleep && sleep.endAt === undefined
      ? { type: 'sleep', title: 'Asleep', value: `for ${formatDuration(now - sleep.startAt)}` }
      : {
          type: 'sleep',
          title: 'Awake',
          value: sleep?.endAt !== undefined ? `woke ${formatAgo(now - sleep.endAt)}` : none,
        },
    {
      type: 'diaper',
      title: 'Last diaper',
      value: diaper ? formatAgo(now - diaper.startAt) : none,
      detail: diaper ? diaperDetail(diaper.wet, diaper.dirty) : undefined,
    },
    {
      type: 'pump',
      title: 'Last pump',
      value: !pump ? none : pump.endAt === undefined ? 'pumping now' : formatAgo(now - pump.endAt),
    },
    {
      // Record only: show what was given and when, never anything about doses.
      type: 'medication',
      title: 'Last meds',
      value: medication ? formatAgo(now - medication.startAt) : none,
      detail: medication?.medName,
    },
  ];
}

type Props = {
  /** `undefined` while loading. */
  latest: Latest | undefined;
};

export function SinceLastCard({ latest }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const now = useNow(60_000);

  if (latest === undefined) {
    return (
      <View style={styles.card} accessibilityLabel="Loading latest entries">
        {Object.keys(EVENT_META).map((type) => (
          <View key={type} style={styles.row}>
            <View style={styles.skeletonIcon} />
            <View style={styles.skeletonText} />
          </View>
        ))}
      </View>
    );
  }

  if (Object.values(latest).every((e) => e === null)) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyTitle}>Nothing logged yet</Text>
        <Text style={styles.detail}>Tap a button below to log the first feed, nap, or diaper.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {buildRows(latest, now).map((row) => (
        <View
          key={row.type}
          style={styles.row}
          accessible
          accessibilityLabel={[row.title, row.value, row.detail].filter(Boolean).join(', ')}>
          <SymbolView
            name={EVENT_META[row.type].symbol}
            tintColor={theme.colors.events[row.type]}
            size={24}
          />
          <View style={styles.rowText}>
            <Text style={styles.title}>
              {row.title} <Text style={styles.value}>{row.value}</Text>
            </Text>
            {row.detail ? (
              <Text style={styles.detail} numberOfLines={1}>
                {row.detail}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    rowText: { flex: 1 },
    title: { ...theme.typography.body, color: theme.colors.textMuted },
    value: { ...theme.typography.bodyStrong, color: theme.colors.text },
    detail: { ...theme.typography.caption, color: theme.colors.textMuted },
    emptyTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
    skeletonIcon: {
      width: 24,
      height: 24,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.border,
    },
    skeletonText: {
      flex: 1,
      height: theme.typography.body.lineHeight,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.border,
    },
  });
