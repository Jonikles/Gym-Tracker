import { memo, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Exercise, ProgressionMembership } from '../../types';
import { PROGRESSION_MAP } from '../../data/progressions';
import { formatMuscleGroup, formatLabel } from '../common/format';
import styles from './ExerciseCard.module.css';

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
  headerExtra?: ReactNode;
  /** Extra class on the card (e.g. a raised surface inside a sheet) */
  className?: string;
}

interface ProgressionNavInfo {
  pm: ProgressionMembership;
  progName: string;
  prevLevel?: number;
  nextLevel?: number;
  prevId?: string;
  nextId?: string;
}

function navInfo(pm: ProgressionMembership, progressionLevelMap?: ProgressionLevelMap): ProgressionNavInfo {
  const levelMap = progressionLevelMap?.get(pm.progressionId);
  // Find nearest lower and higher levels (handles gaps like 15 → 17)
  const levels = levelMap ? [...levelMap.keys()].sort((a, b) => a - b) : [];
  const prevLevel = levels.filter((l) => l < pm.level).pop();
  const nextLevel = levels.find((l) => l > pm.level);
  return {
    pm,
    progName: PROGRESSION_MAP[pm.progressionId]?.name ?? pm.progressionId,
    prevLevel,
    nextLevel,
    prevId: prevLevel !== undefined ? levelMap?.get(prevLevel) : undefined,
    nextId: nextLevel !== undefined ? levelMap?.get(nextLevel) : undefined,
  };
}

function ExerciseCardImpl({
  exercise,
  onClick,
  showDetails = true,
  showProgressionNav = false,
  progressionLevelMap,
  headerExtra,
  className = '',
}: ExerciseCardProps) {
  const navigate = useNavigate();

  const memberships = exercise.progressionMemberships ?? [];
  const hasProgression = memberships.length > 0;
  const meta = [exercise.equipment, exercise.movementPattern].filter((s): s is string => !!s).map(formatLabel);
  const muscles = exercise.muscleGroups ?? [];

  // Progression rows — only shown on the Exercise Library page. The first one
  // shares the meta line; extra memberships (rare) get their own line.
  const navRows = showProgressionNav ? memberships.map((pm) => navInfo(pm, progressionLevelMap)) : [];
  const [firstNav, ...restNav] = navRows;
  const showMeta = showDetails && (meta.length > 0 || muscles.length > 0 || (!hasProgression && !!exercise.progressionLevel));

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const progChip = (row: ProgressionNavInfo) => (
    <button
      type="button"
      className={styles.progressionChip}
      onClick={(e) => { e.stopPropagation(); navigate(`/progressions/${row.pm.progressionId}`); }}
      title={`View ${row.progName} progression`}
    >
      <span className={styles.progressionLevel}>Lv {row.pm.level}</span>
      <span className={styles.progressionName}>{row.progName}</span>
    </button>
  );

  const progNav = (row: ProgressionNavInfo) =>
    (row.prevId || row.nextId) && (
      <div className={styles.progressionNav}>
        {row.prevId && row.prevLevel !== undefined && (
          <button
            type="button"
            className={styles.progressionNavBtn}
            onClick={(e) => { e.stopPropagation(); navigate(`/exercises/${row.prevId}`); }}
            title={`Go to level ${row.prevLevel}`}
            aria-label={`Go to level ${row.prevLevel}`}
          >
            ‹ <span className="num">{row.prevLevel}</span>
          </button>
        )}
        {row.nextId && row.nextLevel !== undefined && (
          <button
            type="button"
            className={styles.progressionNavBtn}
            onClick={(e) => { e.stopPropagation(); navigate(`/exercises/${row.nextId}`); }}
            title={`Go to level ${row.nextLevel}`}
            aria-label={`Go to level ${row.nextLevel}`}
          >
            <span className="num">{row.nextLevel}</span> ›
          </button>
        )}
      </div>
    );

  return (
    <div
      className={`${styles.card} ${onClick ? styles.interactive : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      <div className={styles.header}>
        <h3 className={styles.name}>{exercise.name}</h3>
        {headerExtra}
      </div>

      {(showMeta || firstNav) && (
        <div className={styles.line}>
          <div className={styles.meta}>
            {firstNav && progChip(firstNav)}
            {showDetails && !hasProgression && exercise.progressionLevel && (
              <span className={styles.levelChip}>Lv {exercise.progressionLevel}</span>
            )}
            {showDetails && meta.length > 0 && <span className={styles.metaText}>{meta.join(' · ')}</span>}
            {showDetails &&
              muscles.map((mg) => (
                <span key={mg} className={styles.muscleTag}>
                  {formatMuscleGroup(mg)}
                </span>
              ))}
          </div>
          {firstNav && progNav(firstNav)}
        </div>
      )}

      {restNav.map((row) => (
        <div key={row.pm.progressionId} className={styles.line}>
          <div className={styles.meta}>{progChip(row)}</div>
          {progNav(row)}
        </div>
      ))}
    </div>
  );
}

/** Memoized: list pages render hundreds of these */
export const ExerciseCard = memo(ExerciseCardImpl);
