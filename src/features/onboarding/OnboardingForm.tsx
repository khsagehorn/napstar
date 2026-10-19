import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useTheme, type Theme } from '@/theme';

import { api } from '../../../convex/_generated/api';
import { MAX_NAME_LENGTH } from '../../../convex/lib/validation';

/** Local calendar day as YYYY-MM-DD (birth dates are calendar dates, not instants). */
const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');

// Mirrors the server rules in households.create; the server stays the authority.
const schema = z.object({
  childName: z
    .string()
    .trim()
    .min(1, "Enter your child's name")
    .max(MAX_NAME_LENGTH, `Name must be ${MAX_NAME_LENGTH} characters or fewer`),
  birthDate: z
    .date()
    .refine((d) => dayKey(d) <= dayKey(new Date()), "Birth date can't be in the future"),
});

type FormValues = z.input<typeof schema>;

export function OnboardingForm() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const createHousehold = useMutation(api.households.create);
  const [serverError, setServerError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { childName: '', birthDate: new Date() },
  });

  const onSubmit = handleSubmit(async ({ childName, birthDate }) => {
    setServerError(undefined);
    try {
      await createHousehold({
        child: {
          name: childName,
          birthDate: dayKey(birthDate),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // The auth gate sees the new household and switches to the tabs.
    } catch (err) {
      setServerError(
        err instanceof ConvexError && typeof err.data === 'string'
          ? err.data
          : 'Something went wrong. Please try again.',
      );
    }
  });

  return (
    <Screen>
      <Text style={styles.title} accessibilityRole="header">
        Welcome
      </Text>
      <Text style={styles.body}>Tell us about your little one.</Text>

      <Controller
        control={control}
        name="childName"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Child's name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="words"
            autoComplete="off"
            returnKeyType="done"
            maxLength={MAX_NAME_LENGTH}
            error={errors.childName?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="birthDate"
        render={({ field: { value, onChange } }) => (
          <DateField
            label="Birth date"
            value={value}
            onChange={onChange}
            maximumDate={new Date()}
            error={errors.birthDate?.message}
          />
        )}
      />

      {serverError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {serverError}
        </Text>
      ) : null}

      <Button title="Get started" onPress={onSubmit} loading={isSubmitting} />
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    title: { ...theme.typography.largeTitle, color: theme.colors.text, marginTop: theme.spacing.xxl },
    body: { ...theme.typography.body, color: theme.colors.textMuted },
    error: { ...theme.typography.body, color: theme.colors.danger },
  });
