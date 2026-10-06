import { useEffect, useState } from 'react';

/** Start of the current local day (midnight) as a timestamp */
export function getStartOfToday(now: Date = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/**
 * Returns the start-of-today timestamp (local midnight) and re-renders when the
 * date changes — via a timer to the next local midnight, plus a re-check when
 * the app becomes visible again (iOS suspends timers in background PWAs).
 *
 * Pass the result as a dependency to live queries that depend on "today" so
 * they don't go stale when the app stays open past midnight.
 */
export function useToday(): number {
  const [today, setToday] = useState(() => getStartOfToday());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      const now = new Date();
      setToday(getStartOfToday(now));
      if (timer) clearTimeout(timer);
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      // +1s margin so we land safely after midnight
      timer = setTimeout(refresh, nextMidnight - now.getTime() + 1000);
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
