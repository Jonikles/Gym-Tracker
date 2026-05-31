import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../common';
import { useSession, useSessionExercises } from '../../hooks/useSessions';
import { useRoutine } from '../../hooks/useRoutines';
import { useSets } from '../../hooks/useSets';
import { useExercise } from '../../hooks/useExercises';
import type { SessionExercise, Set } from '../../types';
import styles from './SessionCompare.module.css';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(startedAt: number, completedAt?: number): string {
  if (!completedAt) return 'Incomplete';
  const mins = Math.floor((completedAt - startedAt) / 1000 / 60);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function ExerciseCompare({
  leftSE,
  rightSE,
}: {
  leftSE?: SessionExercise;
  rightSE?: SessionExercise;
}) {
  const leftExercise = useExercise(leftSE?.exerciseId);
  const rightExercise = useExercise(rightSE?.exerciseId);
  const leftSets = useSets(leftSE?.id) ?? [];
  const rightSets = useSets(rightSE?.id) ?? [];

  const name = leftExercise?.name ?? rightExercise?.name ?? 'Unknown';
  const leftWorking = leftSets.filter((s) => !s.isWarmup);
  const rightWorking = rightSets.filter((s) => !s.isWarmup);
  // Volume comparison
  const leftVol = leftWorking.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
  const rightVol = rightWorking.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
  const volDiff = rightVol - leftVol;

  return (
    <Card className={styles.exerciseCard}>
      <div className={styles.exerciseName}>
        {name}
        {!leftSE && <span className={styles.addedBadge}>+ New</span>}
        {!rightSE && <span className={styles.removedBadge}>- Removed</span>}
      </div>
      <div className={styles.setsGrid}>
        <div className={styles.setsCol}>
          {leftWorking.map((s, i) => (
            <SetCompareRow key={s.id} set={s} otherSet={rightWorking[i]} side="left" index={i} />
          ))}
          {leftWorking.length === 0 && <span className={styles.noData}>—</span>}
        </div>
        <div className={styles.setsCol}>
          {rightWorking.map((s, i) => (
            <SetCompareRow key={s.id} set={s} otherSet={leftWorking[i]} side="right" index={i} />
          ))}
          {rightWorking.length === 0 && <span className={styles.noData}>—</span>}
        </div>
      </div>
      {(leftVol > 0 || rightVol > 0) && (
        <div className={styles.volRow}>
          <span>{leftVol > 0 ? `${leftVol.toLocaleString()}kg` : '—'}</span>
          <span className={volDiff > 0 ? styles.positive : volDiff < 0 ? styles.negative : ''}>
            {volDiff > 0 ? `+${volDiff.toLocaleString()}kg` : volDiff < 0 ? `${volDiff.toLocaleString()}kg` : '='}
          </span>
          <span>{rightVol > 0 ? `${rightVol.toLocaleString()}kg` : '—'}</span>
        </div>
      )}
    </Card>
  );
}

function SetCompareRow({
  set,
  otherSet,
  side,
  index,
}: {
  set: Set;
  otherSet?: Set;
  side: 'left' | 'right';
  index: number;
}) {
  const weight = set.weight ?? 0;
  const reps = set.reps ?? 0;
  const otherWeight = otherSet?.weight ?? 0;
  const otherReps = otherSet?.reps ?? 0;

  const weightDiff = side === 'right' ? weight - otherWeight : 0;
  const repsDiff = side === 'right' ? reps - otherReps : 0;

  const weightClass =
    side === 'right' && otherSet
      ? weightDiff > 0
        ? styles.positive
        : weightDiff < 0
        ? styles.negative
        : ''
      : '';
  const repsClass =
    side === 'right' && otherSet
      ? repsDiff > 0
        ? styles.positive
        : repsDiff < 0
        ? styles.negative
        : ''
      : '';

  const parts: string[] = [];
  if (weight > 0) parts.push(`${weight}kg`);
  if (reps > 0) parts.push(`${reps}r`);
  if (set.time && set.time > 0) parts.push(`${set.time}s`);

  return (
    <div className={`${styles.setRow} ${weightClass || repsClass}`}>
      <span className={styles.setIndex}>{index + 1}</span>
      <span>{parts.join(' × ') || '—'}</span>
    </div>
  );
}

interface SessionCompareProps {
  sessionIdA: string;
  sessionIdB: string;
}

export function SessionCompare({ sessionIdA, sessionIdB }: SessionCompareProps) {
  const navigate = useNavigate();
  const sessionA = useSession(sessionIdA);
  const sessionB = useSession(sessionIdB);
  const exercisesA = useSessionExercises(sessionIdA) ?? [];
  const exercisesB = useSessionExercises(sessionIdB) ?? [];
  const routineA = useRoutine(sessionA?.routineId);
  const routineB = useRoutine(sessionB?.routineId);

  // Match exercises by exerciseId
  const matched = useMemo(() => {
    const result: { left?: SessionExercise; right?: SessionExercise }[] = [];
    const usedB = new Set<string>();

    for (const a of exercisesA) {
      const b = exercisesB.find((e) => e.exerciseId === a.exerciseId && !usedB.has(e.id));
      if (b) usedB.add(b.id);
      result.push({ left: a, right: b });
    }
    // Add exercises only in B
    for (const b of exercisesB) {
      if (!usedB.has(b.id)) {
        result.push({ left: undefined, right: b });
      }
    }
    return result;
  }, [exercisesA, exercisesB]);

  if (!sessionA || !sessionB) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button variant="ghost" onClick={() => navigate('/history')}>
          ← Back
        </Button>
        <h1 className={styles.title}>Compare Sessions</h1>
      </header>

      <div className={styles.sessionHeaders}>
        <div className={styles.sessionLabel}>
          <strong>{routineA?.name ?? 'Workout'}</strong>
          <span className={styles.sessionDate}>{formatDate(sessionA.startedAt)}</span>
          <span className={styles.sessionDuration}>{formatDuration(sessionA.startedAt, sessionA.completedAt)}</span>
        </div>
        <div className={styles.vsLabel}>vs</div>
        <div className={styles.sessionLabel}>
          <strong>{routineB?.name ?? 'Workout'}</strong>
          <span className={styles.sessionDate}>{formatDate(sessionB.startedAt)}</span>
          <span className={styles.sessionDuration}>{formatDuration(sessionB.startedAt, sessionB.completedAt)}</span>
        </div>
      </div>

      <div className={styles.exercises}>
        {matched.map((m, i) => (
          <ExerciseCompare key={i} leftSE={m.left} rightSE={m.right} />
        ))}
        {matched.length === 0 && (
          <p className={styles.empty}>No exercises to compare.</p>
        )}
      </div>
    </div>
  );
}
