import { useNavigate } from 'react-router-dom';
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

/** Map from progressionId → level → exerciseId, built by parent for nav */
export type ProgressionLevelMap = Map<string, Map<number, string>>;

interface ExerciseCardProps {
  exercise: Exercise;
  onClick?: () => void;
  showDetails?: boolean;
  /** Show progression links + prev/next nav. Only true on the Exercise Library page. */
  showProgressionNav?: boolean;
  progressionLevelMap?: ProgressionLevelMap;
  /** Optional extra content rendered after the card header (e.g. favorite button) */
  headerExtra?: React.ReactNode;
}

export function ExerciseCard({ exercise, onClick, showDetails = true, showProgressionNav = false, progressionLevelMap, headerExtra }: ExerciseCardProps) {
  const navigate = useNavigate();

  const memberships = exercise.progressionMemberships;
  const hasProgression = memberships && memberships.length > 0;

  return (
    <Card onClick={onClick} interactive={!!onClick}>
      <div className={styles.header}>
        <h3 className={styles.name}>{exercise.name}</h3>
        {exercise.isArchived && <span className={`${styles.badge} ${styles.archivedBadge}`}>Archived</span>}
        {headerExtra}
      </div>
      {showDetails && (
        <div className={styles.details}>
          <div className={styles.infoLine}>
            {exercise.equipment && (
              <span className={styles.infoItem}>
                <span className={styles.infoLabel}>Equipment</span>
                <span className={styles.infoValue}>{formatLabel(exercise.equipment)}</span>
              </span>
            )}
            {exercise.movementPattern && (
              <span className={styles.infoItem}>
                <span className={styles.infoLabel}>Movement</span>
                <span className={styles.infoValue}>{formatLabel(exercise.movementPattern)}</span>
              </span>
            )}
            {!hasProgression && exercise.progressionLevel && (
              <span className={styles.levelBadge}>
                Lvl {exercise.progressionLevel}
              </span>
            )}
          </div>
          {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
            <div className={styles.muscleRow}>
              {exercise.muscleGroups.map((mg) => (
                <span key={mg} className={styles.muscleTag}>
                  {formatMuscleGroup(mg)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progression row(s) — only shown on Exercise Library page */}
      {showProgressionNav && hasProgression && memberships.map((pm) => {
        const progDef = PROGRESSION_MAP[pm.progressionId];
        const progName = progDef?.name ?? pm.progressionId;
        const levelMap = progressionLevelMap?.get(pm.progressionId);
        // Find nearest lower and higher levels (handles gaps like 15 → 17)
        const levels = levelMap ? [...levelMap.keys()].sort((a, b) => a - b) : [];
        const prevLevel = levels.filter((l) => l < pm.level).pop();
        const nextLevel = levels.find((l) => l > pm.level);
        const prevId = prevLevel !== undefined ? levelMap?.get(prevLevel) : undefined;
        const nextId = nextLevel !== undefined ? levelMap?.get(nextLevel) : undefined;

        return (
          <div key={pm.progressionId} className={styles.progressionRow}>
            <span className={styles.levelBadge}>Lvl {pm.level}</span>
            <button
              className={styles.progressionLink}
              onClick={(e) => { e.stopPropagation(); navigate(`/progressions/${pm.progressionId}`); }}
              title={`View ${progName} progression`}
            >
              {progName}
            </button>
            <div className={styles.progressionNav}>
              {prevId && prevLevel !== undefined && (
                <button
                  className={styles.progressionNavBtn}
                  onClick={(e) => { e.stopPropagation(); navigate(`/exercises/${prevId}`); }}
                  title={`Go to level ${prevLevel}`}
                >
                  ◀ Lvl {prevLevel}
                </button>
              )}
              {nextId && nextLevel !== undefined && (
                <button
                  className={styles.progressionNavBtn}
                  onClick={(e) => { e.stopPropagation(); navigate(`/exercises/${nextId}`); }}
                  title={`Go to level ${nextLevel}`}
                >
                  Lvl {nextLevel} ▶
                </button>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
