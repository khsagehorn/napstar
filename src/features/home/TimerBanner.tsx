import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { EVENT_META } from '@/features/events/meta';
import { useNow } from '@/hooks/useNow';
import { errorMessage } from '@/lib/errors';
import { useTheme, type Theme } from '@/theme';

import { api } from '../../../convex/_generated/api';
import type { EventOf } from '../../../convex/events';
import { formatDuration } from '../../../convex/lib/time';

const RUNNING_LABEL = { sleep: 'Sleeping', pump: 'Pumping' } as const;

type Props = { timer: EventOf<'sleep'> | EventOf<'pump'> };

/** A running sleep or pump timer with its elapsed time and a Stop button. */
export function TimerBanner({ timer }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const now = useNow(1_000);
  const stopTimer = useMutation(api.events.stopTimer);
  const [stopping, setStopping] = useState(false);

  const label = RUNNING_LABEL[timer.type];
  const elapsed = formatDuration(now - timer.startAt);

  const onStop = async () => {
    setStopping(true);
    try {
      await stopTimer({ eventId: timer._id, endAt: Date.now() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert(`Couldn't stop the ${timer.type} timer`, errorMessage(err));
    } finally {
      setStopping(false);
    }
  };

  return (
    <View style={[styles.banner, { borderColor: theme.colors.events[timer.type] }]}>
      <SymbolView
        name={EVENT_META[timer.type].symbol}
        tintColor={theme.colors.events[timer.type]}
        size={28}
      />
      <View style={styles.text} accessible accessibilityLabel={`${label} for ${elapsed}`}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.elapsed}>{elapsed}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Stop ${timer.type} timer`}
        accessibilityState={{ busy: stopping, disabled: stopping }}
        disabled={stopping}
        onPress={onStop}
        style={({ pressed }) => [styles.stop, (pressed || stopping) && styles.dimmed]}>
        {stopping ? (
          <ActivityIndicator color={theme.colors.textOnPrimary} />
        ) : (
          <Text style={styles.stopLabel}>Stop</Text>
        )}
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      borderRadius: theme.radii.lg,
      borderWidth: 2,
      backgroundColor: theme.colors.surfaceRaised,
    },
    text: { flex: 1 },
    label: { ...theme.typography.body, color: theme.colors.textMuted },
    elapsed: { ...theme.typography.title, color: theme.colors.text, fontVariant: ['tabular-nums'] },
    stop: {
      minHeight: theme.sizes.minTouchTarget,
      minWidth: theme.sizes.minTouchTarget * 2,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stopLabel: { ...theme.typography.bodyStrong, color: theme.colors.textOnPrimary },
    dimmed: { opacity: 0.6 },
  });
