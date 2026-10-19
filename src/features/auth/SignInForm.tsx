import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';

import { Button } from '@/components/Button';

import { EmailCodeForm } from './EmailCodeForm';

export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();

  async function sendCode(email: string) {
    if (!isLoaded) throw new Error('Still loading, try again in a moment.');
    const attempt = await signIn.create({ identifier: email });
    const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === 'email_code');
    if (!factor || factor.strategy !== 'email_code') {
      throw new Error('Email codes are not enabled for this account.');
    }
    await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
  }

  async function verifyCode(code: string) {
    if (!isLoaded) throw new Error('Still loading, try again in a moment.');
    const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
    if (result.status !== 'complete' || !result.createdSessionId) {
      throw new Error('Sign-in needs another step that this app does not support yet.');
    }
    await setActive({ session: result.createdSessionId });
  }

  return (
    <EmailCodeForm
      title="Sign in"
      submitLabel="Sign in"
      sendCode={sendCode}
      verifyCode={verifyCode}
      footer={
        <Button
          title="New here? Create an account"
          variant="secondary"
          onPress={() => router.replace('/sign-up')}
        />
      }
    />
  );
}
