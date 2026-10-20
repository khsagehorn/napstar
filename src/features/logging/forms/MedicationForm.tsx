import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { ChoiceChips } from '@/components/ChoiceChips';
import { TextField } from '@/components/TextField';
import { TimeField } from '@/components/TimeField';
import { useTheme } from '@/theme';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { LogFormLayout } from '../LogFormLayout';
import { NotesField, notesOrUndefined } from '../NotesField';
import { RecentMedications, type RecentMedication } from '../RecentMedications';
import { resolveTime, useSaveEvent } from '../useSaveEvent';

const DOSE_UNITS = [
  { value: 'ml', label: 'ml' },
  { value: 'mg', label: 'mg' },
  { value: 'drops', label: 'drops' },
  { value: 'tablet', label: 'tablet' },
] as const;

// Record only: the dose is free text and is never checked or suggested.
const schema = z.object({
  time: z.date().nullable(),
  medName: z.string().trim().min(1, 'Enter the medication name'),
  dose: z.string().trim(),
  doseUnit: z.enum(['ml', 'mg', 'drops', 'tablet']),
  notes: z.string(),
});

type FormValues = z.input<typeof schema>;

type Props = { childId: Id<'children'> };

export function MedicationForm({ childId }: Props) {
  const theme = useTheme();
  const { save, error } = useSaveEvent();
  // Fixed at mount: the 30-day window and "last given" text don't need to tick
  // while the sheet is open, and a stable arg keeps the query from refetching.
  const [now] = useState(() => Date.now());
  const recent = useQuery(api.events.recentMedications, { childId, now });
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { time: null, medName: '', dose: '', doseUnit: 'ml', notes: '' },
  });

  const onSave = handleSubmit(({ time, medName, dose, doseUnit, notes }) =>
    save({
      type: 'medication',
      childId,
      startAt: resolveTime(time),
      medName,
      dose,
      doseUnit,
      notes: notesOrUndefined(notes),
    }),
  );

  const fillFrom = ({ medName, dose, doseUnit }: RecentMedication) => {
    setValue('medName', medName, { shouldValidate: true });
    setValue('dose', dose);
    setValue('doseUnit', doseUnit);
  };

  return (
    <LogFormLayout title="Medication" error={error} saving={isSubmitting} onSave={onSave}>
      {recent ? <RecentMedications recent={recent} now={now} onPick={fillFrom} /> : null}
      <Controller
        control={control}
        name="medName"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Medication"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="words"
            autoCorrect={false}
            error={errors.medName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="dose"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Dose (as given)"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="numbers-and-punctuation"
          />
        )}
      />
      <Controller
        control={control}
        name="doseUnit"
        render={({ field: { value, onChange } }) => (
          <ChoiceChips
            label="Unit"
            options={DOSE_UNITS}
            value={value}
            onChange={onChange}
            color={theme.colors.events.medication}
          />
        )}
      />
      <Controller
        control={control}
        name="time"
        render={({ field: { value, onChange } }) => (
          <TimeField label="Given at" value={value} onChange={onChange} />
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
