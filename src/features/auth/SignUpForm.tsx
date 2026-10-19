import { useSignUp } from '@clerk/clerk-expo';
import { router } from 'expo-router';

import { Button } from '@/components/Button';

import { EmailCodeForm } from './EmailCodeForm';

export function SignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp();

  async function sendCode(email: string) {
    if (!isLoaded) throw new Error('Still loading, try again in a moment.');
    await signUp.create({ emailAddress: email });
    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
  }

  async function verifyCode(code: string) {
    if (!isLoaded) throw new Error('Still loading, try again in a moment.');
    const result = await signUp.attemptEmailAddressVerification({ code });
    if (result.status !== 'complete' || !result.createdSessionId) {
      // Happens if the Clerk instance requires fields beyond email (e.g. password).
      const missing = result.missingFields.join(', ');
      throw new Error(
        missing
          ? `Clerk requires more sign-up fields: ${missing}. Make them optional in the Clerk dashboard.`
          : 'Sign-up needs another step that this app does not support yet.',
      );
    }
    await setActive({ session: result.createdSessionId });
  }

  return (
    <EmailCodeForm
      title="Create account"
      submitLabel="Create account"
      sendCode={sendCode}
      verifyCode={verifyCode}
      footer={
        <Button
          title="Already have an account? Sign in"
          variant="secondary"
          onPress={() => router.replace('/sign-in')}
        />
      }
    />
  );
}
