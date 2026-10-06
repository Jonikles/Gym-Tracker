import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common';
import { formatLabel, formatMediumDate } from '../common/format';
import { PROGRESSION_MAP } from '../../data/progressions';
import { useProgressionExercises, useProgressionAchievements } from '../../hooks/useProgressions';
import { useProgressionHistory } from '../../hooks/useProgressionHistory';
import type { Exercise } from '../../types';
import styles from './ProgressionDetail.module.css';

/** Stable fallback while live queries load, so memo deps don't change every render */
const NO_EXERCISES: Exercise[] = [];

interface ProgressionDetailProps {
  progressionId: string;
}

export function ProgressionDetail({ progressionId }: ProgressionDetailProps) {
  const navigate = useNavigate();
  const definition = PROGRESSION_MAP[progressionId];
  const exercises = useProgressionExercises(progressionId) ?? NO_EXERCISES;
  const achievements = useProgressionAchievements() ?? {};
  const achievedLevel = achievements[progressionId] ?? 0;
  const history = useProgressionHistory(progressionId);

  // Group exercises that share the same level
  const levelGroups = useMemo(() => {
    const groups: Map<number, typeof exercises> = new Map();
    for (const ex of exercises) {
      const level =
        ex.progressionMemberships?.find((pm) => pm.progressionId === progressionId)?.level ?? 0;
      if (!groups.has(level)) groups.set(level, []);
      groups.get(level)!.push(ex);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [exercises, progressionId]);

  if (!definition) {
    return (
      <div className={styles.container}>
        <p>Progression not found.</p>
        <Button variant="ghost" onClick={() => navigate('/progressions')}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/progressions')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
          Progressions
        </button>
      </div>

      <header className={`surface-hero ${styles.header}`}>
        <div className={styles.titleBlock}>
          <span className="eyebrow">{definition.category}</span>
          <h1 className={styles.title}>{definition.name}</h1>
          <span className={styles.subtitle}>
            <span className="num">{levelGroups.length}</span> levels
          </span>
        </div>
        {achievedLevel > 0 && (
          <div className={styles.achieved}>
            <span className="stat-value">{achievedLevel}</span>
            <span className="stat-label">Your level</span>
          </div>
        )}
      </header>

      <div className={styles.chain}>
        {levelGroups.map(([level, exs], index) => {
          const isAchieved = level <= achievedLevel;
          return (
            <div key={level} className={styles.levelGroup}>
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={`${styles.connector} ${isAchieved ? styles.connectorAchieved : ''}`}
                />
              )}

              <div className={styles.levelRow}>
                <div
                  className={`${styles.levelIndicator} ${isAchieved ? styles.levelAchieved : ''}`}
                >
                  {level}
                </div>

                <div className={styles.exerciseCards}>
                  {exs.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      className={`${styles.exerciseCard} ${isAchieved ? styles.exerciseAchieved : ''}`}
                      onClick={() => navigate(`/exercises/${exercise.id}`)}
                    >
                      <span className={styles.exerciseName}>{exercise.name}</span>
                      <div className={styles.exerciseMeta}>
                        {exercise.equipment && (
                          <span className={styles.tag}>{formatLabel(exercise.equipment)}</span>
                        )}
                        {exercise.defaultFields.includes('time') && (
                          <span className={styles.tag}>Hold</span>
                        )}
                        {exercise.defaultFields.includes('reps') &&
                          !exercise.defaultFields.includes('time') && (
                            <span className={styles.tag}>Reps</span>
                          )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {exercises.length === 0 && (
        <p className={styles.empty}>No exercises found for this progression.</p>
      )}

      {/* History Timeline */}
      {history && history.length > 0 && (
        <section className={styles.historySection}>
          <h2 className="section-title">History</h2>
          <div className={`surface ${styles.timeline}`}>
            {history.map((entry, i) => {
              const prevEntry = history[i + 1]; // older entry (sorted newest-first)
              const levelChanged = prevEntry && prevEntry.level !== entry.level;
              const levelUp = levelChanged && entry.level > prevEntry.level;

              return (
                <button
                  key={`${entry.sessionId}-${entry.exerciseId}`}
                  type="button"
                  className={styles.timelineEntry}
                  onClick={() => navigate(`/history/${entry.sessionId}`)}
                >
                  <div className={styles.timelineDot} />
                  {i < history.length - 1 && <div className={styles.timelineLine} />}
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineDate}>
                      {formatMediumDate(entry.date)}
                    </span>
                    <span className={styles.timelineExercise}>{entry.exerciseName}</span>
                    <div className={styles.timelineMeta}>
                      <span className="chip chip-accent">Lv <span className="num">{entry.level}</span></span>
                      {levelChanged && (
                        <span className={levelUp ? 'chip chip-success' : 'chip chip-warning'} aria-label={levelUp ? 'Level up' : 'Level down'}>
                          {levelUp ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
