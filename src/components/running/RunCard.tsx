import { memo } from 'react';
import { formatTime } from '../common/format';
import { RUN_KIND_LABELS, formatDistance, formatPace, formatRunTime, runPace } from '../../utils/run';
import type { Run } from '../../types';
import styles from './Running.module.css';

interface RunCardProps {
  run: Run;
  onClick: () => void;
  /** Show the date instead of just the time (lists not grouped by day) */
  showDate?: boolean;
  /** Best times this run set, e.g. ["5 km"] */
  records?: string[];
}

/** List card: name, when, distance · time · pace */
export const RunCard = memo(function RunCard({ run, onClick, showDate, records }: RunCardProps) {
  const when = showDate
    ? new Date(run.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    : formatTime(run.startedAt);
  return (
    <button type="button" className={styles.runCard} onClick={onClick}>
      <span className={styles.runIcon} aria-hidden="true">
        <RunIcon />
      </span>
      <span className={styles.runBody}>
        <span className={styles.runTopRow}>
          <span className={styles.runName}>{run.name}</span>
          {run.kind !== 'road' && <span className="chip">{RUN_KIND_LABELS[run.kind]}</span>}
          {records && records.length > 0 && (
            <span className={`chip chip-pr ${styles.recordChip}`} title={`New best: ${records.join(', ')}`}>
              🏆 {records.length === 1 ? records[0] : records.length}
            </span>
          )}
        </span>
        <span className={`num ${styles.runWhen}`}>{when}</span>
        <span className={styles.runStats}>
          <span><span className={`num ${styles.runStatValue}`}>{formatDistance(run.distance).replace(' km', '')}</span> km</span>
          <span><span className={`num ${styles.runStatValue}`}>{formatRunTime(run.movingTime)}</span></span>
          <span><span className={`num ${styles.runStatValue}`}>{formatPace(runPace(run)).replace(' /km', '')}</span> /km</span>
        </span>
      </span>
      <span className={styles.runChevron} aria-hidden="true">›</span>
    </button>
  );
});

/** Small running-shoe-ish figure used for run cards and the nav */
export function RunIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="14.5" cy="4.5" r="2" />
      <path d="m9 21 2.5-5.5 3 2.5V22" />
      <path d="M6 12.5 8.5 9l4-1 2.5 3.5 3 1" />
      <path d="m12.5 8-1 7.5" />
    </svg>
  );
}
