import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { buildFamilyIndex, type FamilyIndex } from '../utils/exerciseFamilies';
import type { Exercise } from '../types';

/**
 * All exercises (one live query) + the family index built from them.
 * Both are undefined while loading.
 */
export function useFamilyIndex(): { exercises: Exercise[] | undefined; index: FamilyIndex | undefined } {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const index = useMemo(() => (exercises ? buildFamilyIndex(exercises) : undefined), [exercises]);
  return { exercises, index };
}

/** Value that trails `value` by `delay` ms */
export function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Incremental rendering: returns how many items to show plus a ref callback for
 * a sentinel element that loads `step` more when it scrolls into view.
 * Resets to `initial` whenever `resetKey` changes.
 */
export function useIncrementalList(total: number, resetKey: unknown, initial = 40, step = 40) {
  const [visibleCount, setVisibleCount] = useState(initial);
  const [prevKey, setPrevKey] = useState(resetKey);
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setVisibleCount(initial);
  }

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) setVisibleCount((prev) => prev + step);
        },
        { rootMargin: '400px 0px' },
      );
      observerRef.current.observe(node);
    },
    [step],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { visibleCount, hasMore: visibleCount < total, sentinelRef };
}
