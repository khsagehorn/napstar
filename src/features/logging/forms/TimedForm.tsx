import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from 'convex/react';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { CenteredMessage } from '@/components/CenteredMessage';
import { ChoiceChips } from '@/components/ChoiceChips';
import { TimeField } from '@/components/TimeField';
import { useUnits } from '@/hooks/useUnits';
import { useTheme, type Theme } from '@/theme';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import type { VolumeUnit } from '../../../../convex/lib/units';
import type { TimerType } from '../../../../convex/validators';
import { AmountField, amountText, amountToMl } from '../AmountField';
import { LogFormLayout } from '../LogFormLayout';
import { NotesField, notesOrUndefined } from '../NotesField';
import { resolveTime, useSaveEvent } from '../useSaveEvent';

const MODES = [
  { value: 'timer', label: 'Start timer' },
  { value: 'manual', label: 'Enter times' },
] as const;

const schema = z.object({
  mode: z.enum(['timer', 'manual']),
  start: z.date().nullable(),
  end: z.date().nullable(),
  amount: amountText,
  notes: z.string(),
});

type FormValues = z.input<typeof schema>;

const TITLE = { sleep: 'Sleep', pump: 'Pumping' } as const;

type Props = { childId: Id<'children'>; type: TimerType };

/**
 * Sleep and pump: start a timer now, or enter a finished session's start and
 * end. Pump also records an amount for manual entries.
 */
export function TimedForm({ childId, type }: Props) {
  const unit = useUnits();
  const timers = useQuery(api.events.openTimers, { childId });
  if (!unit || timers === undefined) return <CenteredMessage loading />;
  return <TimedFormFields childId={childId} type={type} unit={unit} running={!!timers[type]} />;
}

type FieldsProps = Props & { unit: VolumeUnit; running: boolean };

function TimedFormFields({ childId, type, unit, running }: FieldsProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { save, startTimer, error } = useSaveEvent();
  // Manual entries default to "started an hour ago, ended now", computed once on mount.
  const [anHourAgo] = useState(() => new Date(Date.now() - 60 * 60 * 1000));
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      // Only one timer per type can run, so default to manual entry if one is.
      mode: running ? 'manual' : 'timer',
      start: anHourAgo,
      end: null,
      amount: '',
      notes: '',
    },
  });
  const mode = useWatch({ control, name: 'mode' });
  const timerMode = mode === 'timer';

  const onSave = handleSubmit(async ({ mode, start, end, amount, notes }) => {
    if (mode === 'timer') {
      await startTimer(childId, type);
      return;
    }
    const startAt = resolveTime(start);
    const endAt = resolveTime(end);
    const notesValue = notesOrUndefined(notes);
    await save(
      type === 'pump'
        ? { type, childId, startAt, endAt, amountMl: amountToMl(amount, unit), notes: notesValue }
        : { type, childId, startAt, endAt, notes: notesValue },
    );
  });

  return (
    <LogFormLayout
      title={TITLE[type]}
      error={error}
      saving={isSubmitting}
      onSave={onSave}
      saveLabel={timerMode ? 'Start timer' : 'Save'}>
      <Controller
        control={control}
        name="mode"
        render={({ field: { value, onChange } }) => (
          <ChoiceChips
            label="How"
            options={MODES}
            value={value}
            onChange={onChange}
            color={theme.colors.events[type]}
          />
        )}
      />

      {running ? (
        // Shown in both modes: manual entry is the default while a timer runs,
        // so the user needs to know why. Only starting a timer is blocked.
        <Text style={timerMode ? styles.warning : styles.hint} accessibilityLiveRegion="polite">
          {timerMode
            ? `A ${type} timer is already running. Stop it from Home first.`
            : `A ${type} timer is already running, so you can only enter a finished session here.`}
        </Text>
      ) : timerMode ? (
        <Text style={styles.hint}>The timer starts now. Stop it from the banner on Home.</Text>
      ) : null}

      {timerMode ? null : (
        <>
          <Controller
            control={control}
            name="start"
            render={({ field: { value, onChange } }) => (
              <TimeField label="Started" value={value} onChange={onChange} />
            )}
          />
          <Controller
            control={control}
            name="end"
            render={({ field: { value, onChange } }) => (
              <TimeField label="Ended" value={value} onChange={onChange} />
            )}
          />
          {type === 'pump' ? (
            <Controller
              control={control}
              name="amount"
              render={({ field: { value, onChange, onBlur } }) => (
                <AmountField
                  label="Amount"
                  unit={unit}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={errors.amount?.message}
                />
              )}
            />
          ) : null}
          {/* startTimer takes no notes, so they're only offered for manual entries. */}
          <Controller
            control={control}
            name="notes"
            render={({ field: { value, onChange, onBlur } }) => (
              <NotesField value={value} onChange={onChange} onBlur={onBlur} />
            )}
          />
        </>
      )}
    </LogFormLayout>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    hint: { ...theme.typography.body, color: theme.colors.textMuted },
    warning: { ...theme.typography.body, color: theme.colors.danger },
  });
