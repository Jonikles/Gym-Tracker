import { useState, useCallback, useRef } from 'react';

/**
 * Drop-in replacement for useState that persists to sessionStorage.
 * State survives page navigation within the same tab but clears on tab close.
 *
 * Usage: const [value, setValue] = usePersistedState('exercises.search', '');
 *
 * Supports: string, number, boolean, arrays, objects — anything JSON-serializable.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Read from sessionStorage on first render only
  const [state, setStateRaw] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // Corrupted data — fall through to default
    }
    return defaultValue;
  });

  // Keep a ref so the setter closure always has the latest value
  const stateRef = useRef(state);
  stateRef.current = state;

  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      const newValue =
        typeof value === 'function'
          ? (value as (prev: T) => T)(stateRef.current)
          : value;

      stateRef.current = newValue;
      setStateRaw(newValue);

      try {
        sessionStorage.setItem(key, JSON.stringify(newValue));
      } catch {
        // Storage full or unavailable — state still works in memory
      }
    },
    [key]
  );

  return [state, setState];
}
