import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format, isToday, isYesterday } from 'date-fns';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = {
  label: string;
  /** `null` means "now", resolved when the form is saved. */
  value: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
};

function describe(date: Date) {
  const time = format(date, 'h:mm a');
  if (isToday(date)) return `Today, ${time}`;
  if (isYesterday(date)) return `Yesterday, ${time}`;
  return format(date, 'EEE, MMM d, h:mm a');
}

/** Android has no combined picker: pick the date, then the time. */
function openAndroidPicker(initial: Date, onChange: (date: Date) => void) {
  DateTimePickerAndroid.open({
    value: initial,
    mode: 'date',
    maximumDate: new Date(),
    onValueChange: (_, date) =>
      DateTimePickerAndroid.open({ value: date, mode: 'time', onValueChange: (__, t) => onChange(t) }),
  });
}

/**
 * A date-and-time field that shows "Now" by default. Tapping it lets the user
 * backdate; a reset button returns to "Now". Times are in the device's zone.
 */
export function TimeField({ label, value, onChange, error }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const edit = () => {
    if (Platform.OS === 'ios') onChange(new Date()); // reveals the inline picker
    else openAndroidPicker(value ?? new Date(), onChange);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {value === null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: now`}
            accessibilityHint="Change the time"
            onPress={edit}
            style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
            <Text style={styles.value}>Now</Text>
          </Pressable>
        ) : Platform.OS === 'ios' ? (
          <View style={styles.iosPicker}>
            <DateTimePicker
              value={value}
              mode="datetime"
              display="compact"
              maximumDate={new Date()}
              themeVariant={theme.scheme}
              accentColor={theme.colors.primary}
              accessibilityLabel={label}
              onValueChange={(_, date) => onChange(date)}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${describe(value)}`}
            accessibilityHint="Change the time"
            onPress={edit}
            style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
            <Text style={styles.value}>{describe(value)}</Text>
          </Pressable>
        )}
        {value !== null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Set ${label.toLowerCase()} to now`}
            onPress={() => onChange(null)}
            style={({ pressed }) => [styles.reset, pressed && styles.pressed]}>
            <Text style={styles.resetLabel}>Now</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.xs },
    label: { ...theme.typography.caption, color: theme.colors.textMuted },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    field: {
      flex: 1,
      minHeight: theme.sizes.minTouchTarget + theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
    },
    iosPicker: {
      flex: 1,
      minHeight: theme.sizes.minTouchTarget + theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    reset: {
      minHeight: theme.sizes.minTouchTarget,
      minWidth: theme.sizes.minTouchTarget,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetLabel: { ...theme.typography.bodyStrong, color: theme.colors.primary },
    pressed: { opacity: 0.6 },
    value: { ...theme.typography.body, color: theme.colors.text },
    error: { ...theme.typography.caption, color: theme.colors.danger },
  });
