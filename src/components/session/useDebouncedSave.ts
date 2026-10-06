import { useCallback, useEffect, useRef } from 'react';
import { registerPendingSave, unregisterPendingSave } from './pendingSaves';

/**
 * Debounced persistence that never drops the last edit:
 * - `schedule(value)` (re)starts a timer and remembers the latest value
 * - `flush()` writes the pending value immediately (no-op when nothing is pending)
 * - the pending value is flushed automatically on unmount
 * - while pending, the flush is registered in `pendingSaves` so the workout's
 *   Complete flow can await it before validating.
 */
export function useDebouncedSave<T>(
  key: string,
  save: (value: T) => Promise<unknown> | void,
  delay = 500
) {
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const pendingRef = useRef<{ value: T } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = undefined;
    unregisterPendingSave(key);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) await saveRef.current(pending.value);
  }, [key]);

  const schedule = useCallback(
    (value: T) => {
      pendingRef.current = { value };
      registerPendingSave(key, flush);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, delay);
    },
    [key, flush, delay]
  );

  // Flush on unmount (collapse, navigation, row deletion…)
  useEffect(() => () => {
    void flush();
  }, [flush]);

  return { schedule, flush };
}
