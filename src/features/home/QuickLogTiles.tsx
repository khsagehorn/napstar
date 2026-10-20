import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EVENT_META, EVENT_TYPES } from '@/features/events/meta';
import { useTheme, type Theme } from '@/theme';

/** Five large tiles, one per event type, that open the log sheet. */
export function QuickLogTiles() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {EVENT_TYPES.map((type, i) => {
        const { label, symbol } = EVENT_META[type];
        // Five tiles in two columns: the last one spans the full width.
        const fullWidth = i === EVENT_TYPES.length - 1 && EVENT_TYPES.length % 2 === 1;
        return (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={`Log ${label.toLowerCase()}`}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/log/[type]', params: { type } });
            }}
            style={({ pressed }) => [
              styles.tile,
              fullWidth && styles.fullWidth,
              { borderColor: theme.colors.events[type] },
              pressed && styles.pressed,
            ]}>
            <SymbolView name={symbol} tintColor={theme.colors.events[type]} size={32} />
            <Text style={styles.label}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
    tile: {
      // Two per row: half the width minus half the gap.
      flexBasis: '47%',
      flexGrow: 1,
      minHeight: theme.sizes.tileMinHeight,
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      borderWidth: 2,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    fullWidth: { flexBasis: '100%' },
    pressed: { opacity: 0.6 },
    label: { ...theme.typography.bodyStrong, color: theme.colors.text },
  });
