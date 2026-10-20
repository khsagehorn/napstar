import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from 'convex/react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { CenteredMessage } from '@/components/CenteredMessage';
import { ChoiceChips } from '@/components/ChoiceChips';
import { TextField } from '@/components/TextField';
import { TimeField } from '@/components/TimeField';
import { useUnits } from '@/hooks/useUnits';
import { useTheme } from '@/theme';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import type { EventOf } from '../../../../convex/events';
import { fromMl, type VolumeUnit } from '../../../../convex/lib/units';
import { AmountField, amountText, amountToMl } from '../AmountField';
import { LogFormLayout } from '../LogFormLayout';
import { NotesField, notesOrUndefined } from '../NotesField';
import { resolveTime, useSaveEvent } from '../useSaveEvent';

const METHODS = [
  { value: 'breast_milk', label: 'Breast milk' },
  { value: 'formula', label: 'Formula' },
  { value: 'solid', label: 'Solids' },
] as const;

const schema = z.object({
  time: z.date().nullable(),
  method: z.enum(['breast_milk', 'formula', 'solid']),
  amount: amountText,
  foodName: z.string().trim(),
  notes: z.string(),
});

type FormValues = z.input<typeof schema>;

type Props = { childId: Id<'children'> };

/** Waits for the unit and the last feeding, which supply the defaults. */
export function FeedingForm({ childId }: Props) {
  const unit = useUnits();
  const latest = useQuery(api.events.latestByType, { childId });
  if (!unit || latest === undefined) return <CenteredMessage loading />;
  return <FeedingFormFields childId={childId} unit={unit} last={latest.feeding} />;
}

type FieldsProps = Props & { unit: VolumeUnit; last: EventOf<'feeding'> | null };

function FeedingFormFields({ childId, unit, last }: FieldsProps) {
  const theme = useTheme();
  const { save, error } = useSaveEvent();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    // Two taps for the common case: repeat the last method and amount.
    defaultValues: {
      time: null,
      method: last?.method ?? 'formula',
      amount:
        last?.method !== 'solid' && last?.amountMl !== undefined
          ? String(fromMl(last.amountMl, unit))
          : '',
      foodName: '',
      notes: '',
    },
  });
  const method = useWatch({ control, name: 'method' });

  const onSave = handleSubmit(({ time, method, amount, foodName, notes }) =>
    save({
      type: 'feeding',
      childId,
      startAt: resolveTime(time),
      method,
      amountMl: amountToMl(amount, unit),
      foodName: method === 'solid' ? foodName || undefined : undefined,
      notes: notesOrUndefined(notes),
    }),
  );

  return (
    <LogFormLayout title="Feeding" error={error} saving={isSubmitting} onSave={onSave}>
      <Controller
        control={control}
        name="method"
        render={({ field: { value, onChange } }) => (
          <ChoiceChips
            label="Type"
            options={METHODS}
            value={value}
            onChange={onChange}
            color={theme.colors.events.feeding}
          />
        )}
      />
      {method === 'solid' ? (
        <Controller
          control={control}
          name="foodName"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label="Food (optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. banana"
              autoCapitalize="sentences"
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="amount"
        render={({ field: { value, onChange, onBlur } }) => (
          <AmountField
            label={method === 'solid' ? 'Amount (optional)' : 'Amount'}
            unit={unit}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            error={errors.amount?.message}
          />
        )}
      />
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
