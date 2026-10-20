import type { FunctionReturnType } from 'convex/server';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

import type { api } from '../../../convex/_generated/api';
import { formatAgo } from '../../../convex/lib/time';

export type RecentMedication = FunctionReturnType<typeof api.events.recentMedications>[number];

type Props = {
  recent: RecentMedication[];
  now: number;
  onPick: (medication: RecentMedication) => void;
};

/** "Tylenol · 2.5 ml", or just the name when no dose was recorded. */
export function medicationLabel({ medName, dose, doseUnit }: RecentMedication): string {
  return dose ? `${medName} · ${dose} ${doseUnit}` : medName;
}

/**
 * One-tap repeat of entries given in the last 30 days. Fills the form with
 * exactly what was recorded before; the caregiver still reviews and saves.
 */
export function RecentMedications({ recent, now, onPick }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (recent.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Recent</Text>
      {recent.map((medication) => {
        const label = medicationLabel(medication);
        const ago = `last given ${formatAgo(now - medication.lastGivenAt)}`;
        return (
          <Pressable
            key={`${label}|${medication.lastGivenAt}`}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${ago}`}
            accessibilityHint="Fills in this medication"
            onPress={() => onPick(medication)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Text style={styles.name}>{label}</Text>
            <Text style={styles.ago}>{ago}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.xs },
    label: { ...theme.typography.caption, color: theme.colors.textMuted },
    row: {
      minHeight: theme.sizes.minTouchTarget + theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radii.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
    },
    pressed: { opacity: 0.6 },
    name: { ...theme.typography.bodyStrong, color: theme.colors.text },
    ago: { ...theme.typography.caption, color: theme.colors.textMuted },
  });
