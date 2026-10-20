import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time (UTC ms), re-rendering every `intervalMs` and as soon as
 * the app returns to the foreground, so "X ago" text never shows a stale value.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}
