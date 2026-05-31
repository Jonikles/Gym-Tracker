import { useEffect } from 'react';
import { useSetting } from './useSettings';

/**
 * Applies the current theme setting to the document element.
 * Also updates the theme-color meta tag for the browser chrome.
 * Must be called once at the app root level.
 */
export function useThemeEffect() {
  const theme = useSetting('theme');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    // Update theme-color meta tag
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#0a0a0a');
    }
  }, [theme]);
}
