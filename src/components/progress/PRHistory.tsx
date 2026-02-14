import { usePRsForExercise } from '../../hooks/usePRs';
import { formatPRType, formatPRValue } from '../../utils/pr';
import styles from './PRHistory.module.css';

interface PRHistoryProps {
  exerciseId: string;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PRHistory({ exerciseId }: PRHistoryProps) {
  const prs = usePRsForExercise(exerciseId) ?? [];

  if (prs.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Personal Records</h3>
        <p className={styles.empty}>No PRs yet</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Personal Records</h3>
      <div className={styles.list}>
        {prs.map((pr) => (
          <div key={pr.id} className={`${styles.pr} ${styles[pr.type]}`}>
            <div className={styles.prHeader}>
              <span className={styles.prType}>{formatPRType(pr.type)}</span>
              <span className={styles.prDate}>{formatDate(pr.achievedAt)}</span>
            </div>
            <div className={styles.prValue}>{formatPRValue(pr.type, pr.value)}</div>
            {pr.previousValue !== undefined && (
              <div className={styles.prPrevious}>
                Previous: {formatPRValue(pr.type, pr.previousValue)}
                <span className={styles.improvement}>
                  (+{formatPRValue(pr.type, pr.value - pr.previousValue)})
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
