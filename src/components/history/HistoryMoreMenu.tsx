import { MoreMenu, MoreMenuItem, MoreMenuSection } from './MoreMenu';
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
  return (
    <MoreMenu>
      {(close) => {
        const pick = (fn: () => void) => () => {
          fn();
          close();
        };
        return (
          <>
            <MoreMenuSection label="View">
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
                  Calendar
                </button>
              </div>
            </MoreMenuSection>
            <MoreMenuItem onClick={pick(() => onExport('csv'))}>Export CSV</MoreMenuItem>
            <MoreMenuItem onClick={pick(() => onExport('json'))}>Export JSON</MoreMenuItem>
            <MoreMenuItem onClick={pick(onToggleSelectionMode)}>
              {selectionMode ? 'Cancel selection' : 'Select'}
            </MoreMenuItem>
          </>
        );
      }}
    </MoreMenu>
  );
}
