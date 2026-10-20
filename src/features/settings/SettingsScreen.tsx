import { useAuth } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import { useUnits } from '@/hooks/useUnits';
import { errorMessage } from '@/lib/errors';
import { useTheme, type Theme } from '@/theme';

import { api } from '../../../convex/_generated/api';
import type { VolumeUnit } from '../../../convex/lib/units';

const UNITS = [
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'oz', label: 'Ounces (oz)' },
] as const;

export function SettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { signOut } = useAuth();
  const unit = useUnits();
  // Optimistic so the chip flips immediately; Convex rolls back on failure.
  const setUnitPreference = useMutation(api.users.setUnitPreference).withOptimisticUpdate(
    (store, { unitPreference }) => {
      const me = store.getQuery(api.users.me, {});
      if (me) store.setQuery(api.users.me, {}, { ...me, unitPreference });
    },
  );

  const onUnitChange = async (value: VolumeUnit) => {
    try {
      await setUnitPreference({ unitPreference: value });
    } catch (err) {
      Alert.alert("Couldn't change units", errorMessage(err));
    }
  };

  return (
    <Screen edges={['top']}>
      <Text style={styles.title} accessibilityRole="header">
        Settings
      </Text>
      {unit ? (
        <View style={styles.section}>
          <ChoiceChips label="Volume unit" options={UNITS} value={unit} onChange={onUnitChange} />
          <Text style={styles.hint}>Used for feeding and pumping amounts on this account.</Text>
        </View>
      ) : null}
      <View style={styles.footer}>
        <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
      </View>
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    title: { ...theme.typography.largeTitle, color: theme.colors.text },
    section: { gap: theme.spacing.sm },
    hint: { ...theme.typography.caption, color: theme.colors.textMuted },
    footer: { marginTop: 'auto' },
  });
