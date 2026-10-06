import { useEffect, useState } from 'react';
import { startOfLocalDay, startOfNextLocalDay } from '../utils/session';

/**
 * Returns the start-of-today timestamp (local midnight) and re-renders when the
 * date changes — via a timer to the next local midnight, plus a re-check when
 * the app becomes visible again (iOS suspends timers in background PWAs).
 *
 * Pass the result as a dependency to live queries that depend on "today" so
 * they don't go stale when the app stays open past midnight.
 */
export function useToday(): number {
  const [today, setToday] = useState(() => startOfLocalDay(Date.now()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      const now = Date.now();
      setToday(startOfLocalDay(now));
      if (timer) clearTimeout(timer);
      // +1s margin so we land safely after midnight
      timer = setTimeout(refresh, startOfNextLocalDay(now) - now + 1000);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    refresh();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return today;
}
