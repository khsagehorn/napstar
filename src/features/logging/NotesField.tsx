import { TextField } from '@/components/TextField';

type Props = {
  value: string;
  onChange: (text: string) => void;
  onBlur: () => void;
};

/** Optional free-text notes, shared by every log form. */
export function NotesField({ value, onChange, onBlur }: Props) {
  return (
    <TextField
      label="Notes (optional)"
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      multiline
    />
  );
}

/** Blank notes are omitted rather than stored as "". */
export const notesOrUndefined = (notes: string) => notes.trim() || undefined;
