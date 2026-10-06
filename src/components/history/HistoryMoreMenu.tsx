import { useEffect, useRef, useState } from 'react';
import { Button } from '../common';
import styles from './SessionHistory.module.css';

interface HistoryMoreMenuProps {
  viewMode: 'list' | 'calendar';
  onViewModeChange: (mode: 'list' | 'calendar') => void;
  onExport: (format: 'json' | 'csv') => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
}

/** ⋮ menu on the History header: view toggle, export, selection mode */
export function HistoryMoreMenu({
  viewMode,
  onViewModeChange,
  onExport,
  selectionMode,
  onToggleSelectionMode,
}: HistoryMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside tap
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <div className={styles.moreMenuWrapper} ref={ref}>
      <Button
        variant="ghost"
        onClick={() => setOpen(!open)}
        title="More options"
        aria-label="More options"
        aria-expanded={open}
        className={styles.moreBtn}
      >
        ⋮
      </Button>
      {open && (
        <div className={styles.moreMenuDropdown}>
          <div className={styles.moreMenuSection}>
            <span className={styles.moreMenuLabel}>View</span>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                onClick={pick(() => onViewModeChange('list'))}
              >
                List
              </button>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === 'calendar' ? styles.viewBtnActive : ''}`}
                onClick={pick(() => onViewModeChange('calendar'))}
              >
                Cal
              </button>
            </div>
          </div>
          <button type="button" className={styles.moreMenuOption} onClick={pick(() => onExport('csv'))}>
            Export CSV
          </button>
          <button type="button" className={styles.moreMenuOption} onClick={pick(() => onExport('json'))}>
            Export JSON
          </button>
          <button type="button" className={styles.moreMenuOption} onClick={pick(onToggleSelectionMode)}>
            {selectionMode ? 'Cancel selection' : 'Select'}
          </button>
        </div>
      )}
    </div>
  );
}
