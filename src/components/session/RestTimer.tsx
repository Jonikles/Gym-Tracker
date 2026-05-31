import { useState, useEffect } from 'react';
import { useRestTimer } from '../../context/RestTimerContext';
import styles from './RestTimer.module.css';

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function RestTimer() {
  const { isRunning, remaining, total, skip, addTime } = useRestTimer();
  const [isMinimized, setIsMinimized] = useState(false);

  // Reset minimized state when a new timer starts
  useEffect(() => {
    if (isRunning) setIsMinimized(false);
  }, [isRunning, total]);

  if (!isRunning) return null;

  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;
  const isAlmostDone = remaining <= 5;

  if (isMinimized) {
    return (
      <button
        className={`${styles.minimized} ${isAlmostDone ? styles.almostDone : ''}`}
        onClick={() => setIsMinimized(false)}
      >
        <span className={styles.miniTime}>{formatCountdown(remaining)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`${styles.overlay} ${isAlmostDone ? styles.almostDone : ''}`}>
      {/* Progress ring */}
      <div className={styles.ringWrapper}>
        <svg className={styles.ring} viewBox="0 0 100 100">
          <circle
            className={styles.ringBg}
            cx="50" cy="50" r="42"
            fill="none"
            strokeWidth="6"
          />
          <circle
            className={styles.ringProgress}
            cx="50" cy="50" r="42"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className={styles.timeDisplay}>
          <span className={styles.label}>REST</span>
          <span className={styles.time}>{formatCountdown(remaining)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button className={styles.timeBtn} onClick={() => addTime(-15)} disabled={remaining <= 15}>
          −15s
        </button>
        <button className={styles.skipBtn} onClick={skip}>
          Skip
        </button>
        <button className={styles.timeBtn} onClick={() => addTime(15)}>
          +15s
        </button>
      </div>

      {/* Minimize button */}
      <button className={styles.minimizeBtn} onClick={() => setIsMinimized(true)} title="Minimize">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="4 14 10 14 10 20" />
          <polyline points="20 10 14 10 14 4" />
          <line x1="14" y1="10" x2="21" y2="3" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </button>
    </div>
  );
}
