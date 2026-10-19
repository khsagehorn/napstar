import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  error?: string;
};

/** A calendar-date picker: inline compact control on iOS, dialog on Android. */
export function DateField({ label, value, onChange, maximumDate, error }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const display = format(value, 'MMMM d, yyyy');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <View style={styles.iosRow}>
          <DateTimePicker
            value={value}
            mode="date"
            display="compact"
            maximumDate={maximumDate}
            themeVariant={theme.scheme}
            accentColor={theme.colors.primary}
            accessibilityLabel={label}
            onValueChange={(_, date) => onChange(date)}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${display}`}
          accessibilityHint="Opens a calendar"
          style={styles.field}
          onPress={() =>
            DateTimePickerAndroid.open({
              value,
              mode: 'date',
              maximumDate,
              onValueChange: (_, date) => onChange(date),
            })
          }>
          <Text style={styles.value}>{display}</Text>
        </Pressable>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.xs },
    label: { ...theme.typography.caption, color: theme.colors.textMuted },
    iosRow: {
      minHeight: theme.sizes.minTouchTarget + theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    field: {
      minHeight: theme.sizes.minTouchTarget + theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
    },
    value: { ...theme.typography.body, color: theme.colors.text },
    error: { ...theme.typography.caption, color: theme.colors.danger },
  });
