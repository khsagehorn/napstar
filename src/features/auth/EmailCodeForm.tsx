import { isClerkAPIResponseError } from '@clerk/clerk-expo';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useTheme, type Theme } from '@/theme';

type Props = {
  title: string;
  submitLabel: string;
  /** Sends a code to `email`. Throws on failure. */
  sendCode: (email: string) => Promise<void>;
  /** Verifies `code` and activates the session. Throws on failure. */
  verifyCode: (code: string) => Promise<void>;
  /** Link to the other auth screen. */
  footer: ReactNode;
};

/** Two-step email → one-time-code form shared by sign-in and sign-up. */
export function EmailCodeForm({ title, submitLabel, sendCode, verifyCode, footer }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  const onSend = () =>
    run(async () => {
      await sendCode(email.trim());
      setCodeSent(true);
    });

  const onVerify = () => run(() => verifyCode(code.trim()));

  return (
    <Screen>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>

      {codeSent ? (
        <>
          <Text style={styles.body}>We sent a code to {email.trim()}.</Text>
          <TextField
            label="Code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
            error={error}
            onSubmitEditing={onVerify}
          />
          <Button title={submitLabel} onPress={onVerify} loading={busy} disabled={!code.trim()} />
          <Button
            title="Use a different email"
            variant="secondary"
            onPress={() => {
              setCodeSent(false);
              setCode('');
              setError(undefined);
            }}
          />
        </>
      ) : (
        <>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            error={error}
            onSubmitEditing={onSend}
          />
          <Button title="Send code" onPress={onSend} loading={busy} disabled={!email.trim()} />
        </>
      )}

      {footer}
    </Screen>
  );
}

function messageFor(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors[0];
    return first?.longMessage ?? first?.message ?? 'Something went wrong.';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    title: { ...theme.typography.largeTitle, color: theme.colors.text, marginTop: theme.spacing.xxl },
    body: { ...theme.typography.body, color: theme.colors.textMuted },
  });
