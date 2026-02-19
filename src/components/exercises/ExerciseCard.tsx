import type { Exercise } from '../../types';
import { PROGRESSION_MAP } from '../../data/progressions';
import { Card } from '../common';
import styles from './ExerciseCard.module.css';

// Helper to format muscle group keys for display
function formatMuscleGroup(mg: string): string {
  return mg
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper to capitalize first letter
function formatLabel(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface ExerciseCardProps {
  exercise: Exercise;
  onClick?: () => void;
  showDetails?: boolean;
}

export function ExerciseCard({ exercise, onClick, showDetails = true }: ExerciseCardProps) {
  return (
    <Card onClick={onClick} interactive={!!onClick}>
      <div className={styles.header}>
        <h3 className={styles.name}>{exercise.name}</h3>
        {exercise.isPreset && <span className={styles.badge}>Preset</span>}
        {exercise.isArchived && <span className={`${styles.badge} ${styles.archivedBadge}`}>Archived</span>}
      </div>
      {showDetails && (
        <div className={styles.details}>
          {exercise.equipment && (
            <span className={styles.tag}>{formatLabel(exercise.equipment)}</span>
          )}
          {exercise.movementPattern && (
            <span className={styles.tag}>{formatLabel(exercise.movementPattern)}</span>
          )}
          {exercise.muscleGroups?.slice(0, 2).map((mg) => (
            <span key={mg} className={styles.tag}>
              {formatMuscleGroup(mg)}
            </span>
          ))}
          {exercise.muscleGroups && exercise.muscleGroups.length > 2 && (
            <span className={styles.tag}>+{exercise.muscleGroups.length - 2}</span>
          )}
            {exercise.progressionMemberships && exercise.progressionMemberships.length > 0 && (
                <span className={styles.levelBadge}>
                    Lvl {exercise.progressionMemberships[0].level}
                    {exercise.progressionMemberships.length === 1 && (
                        <> &middot; {PROGRESSION_MAP[exercise.progressionMemberships[0].progressionId]?.name ?? exercise.progressionMemberships[0].progressionId}</>
                    )}
                    {exercise.progressionMemberships.length > 1 && (
                        <> &middot; {exercise.progressionMemberships.length} progressions</>
                    )}
                </span>
            )}
            {!exercise.progressionMemberships?.length && exercise.progressionLevel && (
                <span className={styles.levelBadge}>
                    Lvl {exercise.progressionLevel}
                </span>
            )}
        </div>
      )}
    </Card>
  );
}
