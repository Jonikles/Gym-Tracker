import { usePRsForExercise } from '../../hooks/usePRs';
import { formatPRType, formatPRValue } from '../../utils/pr';
import { formatMediumDate } from '../common/format';
import styles from './PRHistory.module.css';

interface PRHistoryProps {
  exerciseId: string;
}

export function PRHistory({ exerciseId }: PRHistoryProps) {
  const allPrs = usePRsForExercise(exerciseId) ?? [];
  const prs = allPrs.filter((pr) => pr.type !== 'e1rm');

  return (
    <section className={styles.container} aria-label="Personal records">
      <h2 className="section-title">Personal records</h2>
      {prs.length === 0 ? (
        <p className={`surface ${styles.empty}`}>No PRs yet</p>
      ) : (
        <ul className={`surface ${styles.list}`}>
          {prs.map((pr) => (
            <li key={pr.id} className={styles.pr}>
              <div className={styles.prMain}>
                <span className={styles.prValue}>
                  <span className="num">{formatPRValue(pr.type, pr.value)}</span>
                </span>
                {pr.previousValue !== undefined && (
                  <span className={styles.prPrevious}>
                    was <span className="num">{formatPRValue(pr.type, pr.previousValue)}</span>
                    <span className={styles.improvement}>
                      +<span className="num">{formatPRValue(pr.type, pr.value - pr.previousValue)}</span>
                    </span>
                  </span>
                )}
              </div>
              <div className={styles.prSide}>
                <span className="chip chip-pr">{formatPRType(pr.type)}</span>
                <span className={styles.prDate}>{formatMediumDate(pr.achievedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
