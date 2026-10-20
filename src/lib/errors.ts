import { ConvexError } from 'convex/values';

/** The user-facing message from a failed mutation, or a generic fallback. */
export function errorMessage(err: unknown): string {
  return err instanceof ConvexError && typeof err.data === 'string'
    ? err.data
    : 'Something went wrong. Please try again.';
}
