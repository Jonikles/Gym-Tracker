import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common';
import { ProgressChart } from './Charts';
import { PRHistory } from './PRHistory';
import { useExercise } from '../../hooks/useExercises';
import { useExerciseHistory } from '../../hooks/useAnalytics';
import styles from './ExerciseProgress.module.css';

interface ExerciseProgressProps {
  exerciseId: string;
}

export function ExerciseProgress({ exerciseId }: ExerciseProgressProps) {
  const navigate = useNavigate();
  const exercise = useExercise(exerciseId);
  const [includeWarmups, setIncludeWarmups] = useState(false);
  const [includeVariations, setIncludeVariations] = useState(false);

  const history = useExerciseHistory(exerciseId, {
    includeWarmups,
    includeParentVariations: includeVariations,
  });

  if (!exercise) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button variant="ghost" onClick={() => navigate('/progress')}>
          ← Back
        </Button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{exercise.name}</h1>
          <div className={styles.meta}>
            {exercise.equipment && <span>{exercise.equipment}</span>}
            {exercise.movementPattern && <span>{exercise.movementPattern}</span>}
          </div>
        </div>
      </header>

      <div className={styles.filters}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={!includeWarmups}
            onChange={(e) => setIncludeWarmups(!e.target.checked)}
          />
          <span>Exclude warmups</span>
        </label>
        {exercise.parentId && (
          <label className={styles.toggle}>
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
        <p className={styles.empty}>No workout data for this exercise yet.</p>
      ) : (
        <>
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>{history.totalSessions}</span>
              <span className={styles.summaryLabel}>Sessions</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>{history.totalSets}</span>
              <span className={styles.summaryLabel}>Total Sets</span>
            </div>
          </div>

          <div className={styles.charts}>
            <ProgressChart
              data={history.weightOverTime}
              title="Weight Over Time"
              unit="kg"
              color="var(--pr-weight)"
            />
            <ProgressChart
              data={history.volumeOverTime}
              title="Volume Over Time"
              unit="kg"
              color="var(--color-success)"
            />
            <ProgressChart
              data={history.e1rmOverTime}
              title="Estimated 1RM Over Time"
              unit="kg"
              color="var(--pr-e1rm)"
            />
          </div>

          <PRHistory exerciseId={exerciseId} />
        </>
      )}
    </div>
  );
}
