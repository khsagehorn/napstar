import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { TimeField } from '@/components/TimeField';
import { ToggleChip } from '@/components/ToggleChip';
import { useTheme, type Theme } from '@/theme';

import type { Id } from '../../../../convex/_generated/dataModel';
import { LogFormLayout } from '../LogFormLayout';
import { NotesField, notesOrUndefined } from '../NotesField';
import { resolveTime, useSaveEvent } from '../useSaveEvent';

// Mirrors the server's diaper rule; the server stays the authority.
const schema = z
  .object({
    time: z.date().nullable(),
    wet: z.boolean(),
    dirty: z.boolean(),
    notes: z.string(),
  })
  .refine((v) => v.wet || v.dirty, { message: 'Choose wet, dirty, or both', path: ['wet'] });

type FormValues = z.input<typeof schema>;

type Props = { childId: Id<'children'> };

export function DiaperForm({ childId }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { save, error } = useSaveEvent();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { time: null, wet: true, dirty: false, notes: '' },
  });
  const [wet, dirty] = useWatch({ control, name: ['wet', 'dirty'] });

  const onSave = handleSubmit(({ time, wet, dirty, notes }) =>
    save({
      type: 'diaper',
      childId,
      startAt: resolveTime(time),
      wet,
      dirty,
      notes: notesOrUndefined(notes),
    }),
  );

  return (
    <LogFormLayout title="Diaper" error={error} saving={isSubmitting} onSave={onSave}>
      <View style={styles.group}>
        <View style={styles.chips}>
          <Controller
            control={control}
            name="wet"
            render={({ field: { value, onChange } }) => (
              <ToggleChip
                label="Wet"
                selected={value}
                color={theme.colors.events.diaper}
                onPress={() => onChange(!value)}
              />
            )}
          />
          <Controller
            control={control}
            name="dirty"
            render={({ field: { value, onChange } }) => (
              <ToggleChip
                label="Dirty"
                selected={value}
                color={theme.colors.events.diaper}
                onPress={() => onChange(!value)}
              />
            )}
          />
          <ToggleChip
            label="Both"
            selected={wet && dirty}
            color={theme.colors.events.diaper}
            onPress={() => {
              setValue('wet', true, { shouldValidate: true });
              setValue('dirty', true, { shouldValidate: true });
            }}
          />
        </View>
        {errors.wet?.message ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {errors.wet.message}
          </Text>
        ) : null}
      </View>

      <Controller
        control={control}
        name="time"
        render={({ field: { value, onChange } }) => (
          <TimeField label="Time" value={value} onChange={onChange} />
        )}
      />

      <Controller
        control={control}
        name="notes"
        render={({ field: { value, onChange, onBlur } }) => (
          <NotesField value={value} onChange={onChange} onBlur={onBlur} />
        )}
      />
    </LogFormLayout>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    group: { gap: theme.spacing.xs },
    chips: { flexDirection: 'row', gap: theme.spacing.md },
    error: { ...theme.typography.caption, color: theme.colors.danger },
  });
