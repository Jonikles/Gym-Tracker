import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common';
import { PROGRESSION_MAP } from '../../data/progressions';
import { useProgressionExercises, useProgressionAchievements } from '../../hooks/useProgressions';
import styles from './ProgressionDetail.module.css';

interface ProgressionDetailProps {
  progressionId: string;
}

export function ProgressionDetail({ progressionId }: ProgressionDetailProps) {
  const navigate = useNavigate();
  const definition = PROGRESSION_MAP[progressionId];
  const exercises = useProgressionExercises(progressionId) ?? [];
  const achievements = useProgressionAchievements() ?? {};
  const achievedLevel = achievements[progressionId] ?? 0;

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
      <header className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/progressions')}>
          ← Back
        </Button>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{definition.name}</h1>
          <span className={styles.category}>{definition.category}</span>
        </div>
        {achievedLevel > 0 && (
          <span className={styles.achievedBadge}>Your Level: {achievedLevel}</span>
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
                      className={`${styles.exerciseCard} ${isAchieved ? styles.exerciseAchieved : ''}`}
                      onClick={() => navigate(`/exercises/${exercise.id}`)}
                    >
                      <span className={styles.exerciseName}>{exercise.name}</span>
                      <div className={styles.exerciseMeta}>
                        {exercise.equipment && (
                          <span className={styles.tag}>{exercise.equipment}</span>
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
    </div>
  );
}
