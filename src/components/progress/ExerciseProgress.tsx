import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, SkeletonList } from '../common';
import { ProgressChart } from './Charts';
import { PRHistory } from './PRHistory';
import { formatLabel } from '../common/format';
import { db } from '../../db';
import { useExerciseHistory } from '../../hooks/useAnalytics';
import styles from './ExerciseProgress.module.css';

interface ExerciseProgressProps {
  exerciseId: string;
}

export function ExerciseProgress({ exerciseId }: ExerciseProgressProps) {
  const navigate = useNavigate();
  // undefined = loading, null = not found
  const exercise = useLiveQuery(
    () => db.exercises.get(exerciseId).then((e) => e ?? null),
    [exerciseId]
  );
  const [includeWarmups, setIncludeWarmups] = useState(false);
  const [includeVariations, setIncludeVariations] = useState(false);

  const history = useExerciseHistory(exerciseId, {
    includeWarmups,
    includeParentVariations: includeVariations,
  });

  if (exercise === undefined) {
    return (
      <div className={styles.container}>
        <SkeletonList count={3} lines={2} />
      </div>
    );
  }

  if (exercise === null) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Exercise not found.</p>
        <Button variant="secondary" onClick={() => navigate('/progress')}>
          Back to Progress
        </Button>
      </div>
    );
  }

  const meta = [exercise.equipment, exercise.movementPattern].filter((s): s is string => !!s).map(formatLabel);

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/progress')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
          Progress
        </button>
      </div>

      <header className={styles.header}>
        <h1 className={`page-title ${styles.title}`}>{exercise.name}</h1>
        {meta.length > 0 && <p className={styles.meta}>{meta.join(' · ')}</p>}
      </header>

      <div className={styles.filters}>
        <label className={`${styles.toggle} ${!includeWarmups ? styles.toggleOn : ''}`}>
          <input
            type="checkbox"
            checked={!includeWarmups}
            onChange={(e) => setIncludeWarmups(!e.target.checked)}
          />
          <span>Exclude warmups</span>
        </label>
        {exercise.parentId && (
          <label className={`${styles.toggle} ${includeVariations ? styles.toggleOn : ''}`}>
            <input
              type="checkbox"
              checked={includeVariations}
              onChange={(e) => setIncludeVariations(e.target.checked)}
            />
            <span>Include parent variations</span>
          </label>
        )}
      </div>

      {!history ? (
        <p className={`surface ${styles.empty}`}>No workout data for this exercise yet.</p>
      ) : (
        <>
          <div className={styles.summary}>
            <div className={`${styles.summaryItem} ${styles.summaryAccent}`}>
              <span className="stat-value">{history.totalSessions}</span>
              <span className="stat-label">Sessions</span>
            </div>
            <div className={styles.summaryItem}>
              <span className="stat-value">{history.totalSets}</span>
              <span className="stat-label">Total sets</span>
            </div>
          </div>

          <div className={styles.charts}>
            <ProgressChart data={history.weightOverTime} title="Weight over time" unit="kg" />
            <ProgressChart data={history.volumeOverTime} title="Volume over time" unit="kg" />
          </div>

          <PRHistory exerciseId={exerciseId} />
        </>
      )}
    </div>
  );
}
