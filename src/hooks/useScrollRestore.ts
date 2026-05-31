import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Saves scroll position when navigating away from a page,
 * restores it when coming back.
 *
 * Usage: call useScrollRestore() at the top of any page/list component.
 */
export function useScrollRestore() {
  const { pathname } = useLocation();
  const key = `scroll:${pathname}`;
  const hasRestored = useRef(false);

  // Restore scroll position on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const y = parseInt(saved, 10);
      // Defer to let the DOM render first
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
        hasRestored.current = true;
      });
    } else {
      hasRestored.current = true;
    }
  }, [key]);

  // Save scroll position on unmount
  useEffect(() => {
    return () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };
  }, [key]);
}
