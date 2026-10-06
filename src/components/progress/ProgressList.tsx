import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Input, Select } from '../common';
import { formatLabel, formatMuscleGroup } from '../common/format';
import { StrengthStandards } from './StrengthStandards';
import { useExercisesWithHistory } from '../../hooks/useAnalytics';
import { useUniqueMuscleGroups, useUniqueEquipment } from '../../hooks/useExercises';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import { db } from '../../db';
import type { Exercise, MuscleGroup, Set as WorkoutSet } from '../../types';
import styles from './ProgressList.module.css';

interface ExerciseItemProps {
  exercise: Exercise;
  sessionCount: number;
  latestBest?: string;
  onClick: () => void;
}

/** Pick the top working set (heaviest, then most reps / longest) */
function pickBestSet(sets: WorkoutSet[]): WorkoutSet | undefined {
  let best: WorkoutSet | undefined;
  for (const s of sets) {
    if (s.isWarmup) continue;
    if (!best) {
      best = s;
      continue;
    }
    const bw = best.weight ?? 0;
    const sw = s.weight ?? 0;
    if (sw > bw) best = s;
    else if (sw === bw) {
      if ((s.reps ?? 0) > (best.reps ?? 0)) best = s;
      else if ((s.reps ?? 0) === (best.reps ?? 0) && (s.time ?? 0) > (best.time ?? 0)) best = s;
    }
  }
  return best;
}

function formatSet(s: WorkoutSet): string | undefined {
  const parts: string[] = [];
  if (s.weight) parts.push(`${s.weight}kg`);
  if (s.reps) parts.push(s.weight ? `× ${s.reps}` : `${s.reps} reps`);
  if (s.time) parts.push(s.reps || s.weight ? `· ${s.time}s` : `${s.time}s`);
  if (!parts.length && s.distance) parts.push(`${s.distance}m`);
  return parts.length ? parts.join(' ') : undefined;
}

/**
 * Latest session's best set for every exercise, in one pass:
 * completed sessions (newest first) → their sessionExercises → those sets.
 */
function useLatestBestSets() {
  return useLiveQuery(async () => {
    const sessions = await db.sessions.filter((s) => !!s.completedAt).toArray();
    const startedAt = new Map(sessions.map((s) => [s.id, s.startedAt]));
    const sessionExercises = await db.sessionExercises
      .where('sessionId')
      .anyOf([...startedAt.keys()])
      .toArray();

    // Latest sessionExercise per exercise
    const latest = new Map<string, { seId: string; at: number }>();
    for (const se of sessionExercises) {
      const at = startedAt.get(se.sessionId) ?? 0;
      const cur = latest.get(se.exerciseId);
      if (!cur || at > cur.at) latest.set(se.exerciseId, { seId: se.id, at });
    }

    const seIds = [...latest.values()].map((l) => l.seId);
    const sets = await db.sets.where('sessionExerciseId').anyOf(seIds).toArray();
    const setsBySe = new Map<string, WorkoutSet[]>();
    for (const s of sets) {
      const list = setsBySe.get(s.sessionExerciseId);
      if (list) list.push(s);
      else setsBySe.set(s.sessionExerciseId, [s]);
    }

    const result = new Map<string, string>();
    for (const [exerciseId, { seId }] of latest) {
      const best = pickBestSet(setsBySe.get(seId) ?? []);
      const label = best && formatSet(best);
      if (label) result.set(exerciseId, label);
    }
    return result;
  }, []);
}

function ExerciseItem({ exercise, sessionCount, latestBest, onClick }: ExerciseItemProps) {
  const muscles = exercise.muscleGroups?.slice(0, 2).map(formatMuscleGroup).join(', ');
  const meta = [exercise.equipment && formatLabel(exercise.equipment), muscles].filter(Boolean).join(' · ');
  return (
    <button type="button" className={`surface ${styles.item}`} onClick={onClick}>
      <div className={styles.exerciseInfo}>
        <span className={styles.exerciseName}>{exercise.name}</span>
        {meta && <span className={styles.exerciseMeta}>{meta}</span>}
      </div>
      <div className={styles.itemRight}>
        {latestBest && <span className={`num ${styles.latestBest}`}>{latestBest}</span>}
        <span className={styles.sessionCount}>
          <span className="num">{sessionCount}</span> {sessionCount === 1 ? 'session' : 'sessions'}
        </span>
      </div>
      <span className={styles.chevron} aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}

export function ProgressList() {
  const navigate = useNavigate();
  useScrollRestore();
  const exercisesWithHistory = useExercisesWithHistory() ?? [];
  const latestBestSets = useLatestBestSets();
  const [searchQuery, setSearchQuery] = usePersistedState('progress.search', '');
  const [muscleFilter, setMuscleFilter] = usePersistedState<MuscleGroup | ''>('progress.muscle', '');
  const [equipmentFilter, setEquipmentFilter] = usePersistedState('progress.equipment', '');

  const muscleGroups = useUniqueMuscleGroups() ?? [];
  const equipment = useUniqueEquipment() ?? [];

  const filteredExercises = exercisesWithHistory.filter(({ exercise }) => {
    if (searchQuery && !exercise.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (muscleFilter && !exercise.muscleGroups?.includes(muscleFilter)) {
      return false;
    }
    if (equipmentFilter && exercise.equipment !== equipmentFilter) {
      return false;
    }
    return true;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setMuscleFilter('');
    setEquipmentFilter('');
  };

  const hasFilters = searchQuery || muscleFilter || equipmentFilter;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="page-title">Progress</h1>
      </header>

      <StrengthStandards />

      <section className={styles.section} aria-label="Exercise progress">
        <div className={styles.sectionHeader}>
          <h2 className="section-title">Exercises</h2>
          {exercisesWithHistory.length > 0 && (
            <span className={styles.sectionMeta}>
              <span className="num">{filteredExercises.length}</span> tracked
            </span>
          )}
        </div>

        <div className={styles.filters}>
          <Input
            type="search"
            placeholder="Search exercises…"
            aria-label="Search exercises"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className={styles.filterRow}>
            <Select
              aria-label="Filter by muscle"
              value={muscleFilter}
              onChange={(e) => setMuscleFilter(e.target.value as MuscleGroup | '')}
              options={muscleGroups.map((mg) => ({ value: mg, label: formatMuscleGroup(mg) }))}
              placeholder="All muscles"
            />
            <Select
              aria-label="Filter by equipment"
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              options={equipment.map((eq) => ({ value: eq, label: formatLabel(eq) }))}
              placeholder="All equipment"
            />
          </div>
          {hasFilters && (
            <button type="button" className={styles.clearFilters} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        <div className={styles.list}>
          {filteredExercises.map(({ exercise, sessionCount }) => (
            <ExerciseItem
              key={exercise.id}
              exercise={exercise}
              sessionCount={sessionCount}
              latestBest={latestBestSets?.get(exercise.id)}
              onClick={() => navigate(`/progress/${exercise.id}`)}
            />
          ))}
          {filteredExercises.length === 0 && (
            <p className={styles.empty}>
              {exercisesWithHistory.length === 0
                ? 'Complete some workouts to see progress data.'
                : 'No exercises match your filters.'}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
