import { useConvexAuth, useMutation } from 'convex/react';
import { useEffect, useState } from 'react';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

type Result = { status: 'stored'; userId: Id<'users'> } | { status: 'error'; message: string };
type State = { status: 'idle' | 'storing' } | Result;

/**
 * Upserts the signed-in user's row once Convex has a valid Clerk token.
 * Other user-scoped queries should wait for `status === 'stored'`.
 */
export function useStoreUser(): State {
  const { isAuthenticated } = useConvexAuth();
  const store = useMutation(api.users.store);
  const [result, setResult] = useState<Result>();

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    store({})
      .then((userId) => {
        if (!cancelled) setResult({ status: 'stored', userId });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResult({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load your account.',
          });
        }
      });
    return () => {
      cancelled = true;
      // Forget the previous account's result on sign-out.
      setResult(undefined);
    };
  }, [isAuthenticated, store]);

  if (!isAuthenticated) return { status: 'idle' };
  return result ?? { status: 'storing' };
}
