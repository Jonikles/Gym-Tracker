import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, ConfirmDialog } from '../common';
import { deleteSession, repeatSession, useSession, useSessionExercises, useActiveSession } from '../../hooks/useSessions';
import { useRoutine } from '../../hooks/useRoutines';
import { useSets } from '../../hooks/useSets';
import { useExercise } from '../../hooks/useExercises';
import { usePRsForSession } from '../../hooks/usePRs';
import { formatPRType } from '../../utils/pr';
import type { SessionExercise as SessionExerciseType, Set, PR } from '../../types';
import styles from './SessionDetail.module.css';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startedAt: number, completedAt?: number): string {
  if (!completedAt) return 'Incomplete';
  const mins = Math.floor((completedAt - startedAt) / 1000 / 60);
  if (mins < 60) return `${mins} minutes`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

/** Format seconds into a readable time string */
function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/** Format distance in meters */
function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${meters}m`;
}

/** Build a readable string for a set's data based on what fields are populated */
function formatSetData(set: Set): string {
  const parts: string[] = [];

  const hasWeight = set.weight !== undefined && set.weight > 0;
  const hasReps = set.reps !== undefined && set.reps > 0;
  const hasTime = set.time !== undefined && set.time > 0;
  const hasDistance = set.distance !== undefined && set.distance > 0;

  // Weight + Reps (standard: "30kg × 8 reps")
  if (hasWeight && hasReps && !hasTime && !hasDistance) {
    parts.push(`${set.weight}kg × ${set.reps} reps`);
  }
  // Weight + Time (e.g. farmers carry: "30kg × 45s")
  else if (hasWeight && hasTime) {
    parts.push(`${set.weight}kg × ${formatSeconds(set.time!)}`);
    if (hasDistance) parts.push(formatDistance(set.distance!));
  }
  // Weight + Distance (e.g. weighted carry: "30kg × 50m")
  else if (hasWeight && hasDistance && !hasTime) {
    parts.push(`${set.weight}kg × ${formatDistance(set.distance!)}`);
  }
  // Weight only (e.g. just a weight hold)
  else if (hasWeight && !hasReps && !hasTime && !hasDistance) {
    parts.push(`${set.weight}kg`);
  }
  // Reps only (bodyweight: "12 reps")
  else if (hasReps && !hasWeight) {
    parts.push(`${set.reps} reps`);
  }
  // Time only (plank, hold: "45s")
  else if (hasTime && !hasWeight && !hasReps) {
    parts.push(formatSeconds(set.time!));
    if (hasDistance) parts.push(formatDistance(set.distance!));
  }
  // Distance only
  else if (hasDistance && !hasWeight && !hasReps && !hasTime) {
    parts.push(formatDistance(set.distance!));
  }
  // Reps + Time (e.g. AMRAP)
  else if (hasReps && hasTime && !hasWeight) {
    parts.push(`${set.reps} reps in ${formatSeconds(set.time!)}`);
  }
  // Fallback: show whatever is available
  else {
    if (hasWeight) parts.push(`${set.weight}kg`);
    if (hasReps) parts.push(`${set.reps} reps`);
    if (hasTime) parts.push(formatSeconds(set.time!));
    if (hasDistance) parts.push(formatDistance(set.distance!));
  }

  if (parts.length === 0) return '—';
  return parts.join(' · ');
}

/** Compute a meaningful volume summary for an exercise's working sets */
function computeVolumeSummary(sets: Set[]): string {
  // Check what kind of data these sets have
  const hasAnyWeight = sets.some((s) => s.weight && s.weight > 0);
  const hasAnyReps = sets.some((s) => s.reps && s.reps > 0);
  const hasAnyTime = sets.some((s) => s.time && s.time > 0);
  const hasAnyDistance = sets.some((s) => s.distance && s.distance > 0);

  // Weight × Reps = total kg volume
  if (hasAnyWeight && hasAnyReps) {
    const vol = sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
    return `${vol.toLocaleString()}kg vol`;
  }

  // Weight × Time = total kg·s
  if (hasAnyWeight && hasAnyTime) {
    const totalTime = sets.reduce((sum, s) => sum + (s.time ?? 0), 0);
    return `${sets.reduce((sum, s) => sum + (s.weight ?? 0), 0)}kg · ${formatSeconds(totalTime)}`;
  }

  // Weight × Distance
  if (hasAnyWeight && hasAnyDistance) {
    const totalDist = sets.reduce((sum, s) => sum + (s.distance ?? 0), 0);
    return `${sets.reduce((sum, s) => sum + (s.weight ?? 0), 0)}kg · ${formatDistance(totalDist)}`;
  }

  // Reps only = total reps
  if (hasAnyReps) {
    const totalReps = sets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
    return `${totalReps} total reps`;
  }

  // Time only = total time
  if (hasAnyTime) {
    const totalTime = sets.reduce((sum, s) => sum + (s.time ?? 0), 0);
    return formatSeconds(totalTime) + ' total';
  }

  // Distance only
  if (hasAnyDistance) {
    const totalDist = sets.reduce((sum, s) => sum + (s.distance ?? 0), 0);
    return formatDistance(totalDist) + ' total';
  }

  return '';
}

// v1.4.1: Receive PRs as prop instead of calling hook per-set
// v1.4.2: Added setNumber prop
function SetDisplay({ set, prs, setNumber }: { set: Set; prs: PR[]; setNumber: number }) {
  return (
    <div className={`${styles.set} ${set.isWarmup ? styles.warmup : ''}`}>
      <div className={styles.setNumberCol}>
        <span className={styles.setNumber}>{setNumber}</span>
        {set.isWarmup && <span className={styles.setLabel}>W</span>}
      </div>
      <div className={styles.setDivider} />
      <span className={styles.setData}>
        {formatSetData(set)}
        {set.intensityTechnique && set.intensityTechnique !== 'standard' && (
          <span className={styles.technique}> ({set.intensityTechnique})</span>
        )}
      </span>
      {prs.length > 0 && (
        <div className={styles.prBadges}>
          {prs.map((pr) => (
            <span key={pr.id} className={`${styles.prBadge} ${styles[pr.type]}`}>
              {formatPRType(pr.type)} PR
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// v1.4.1: Receive prsBySetId map as prop
function ExerciseDisplay({
  sessionExercise,
  prsBySetId,
}: {
  sessionExercise: SessionExerciseType;
  prsBySetId: Map<string, PR[]>;
}) {
  const exercise = useExercise(sessionExercise.exerciseId);
  const sets = useSets(sessionExercise.id) ?? [];
  const [isExpanded, setIsExpanded] = useState(true);

  const workingSets = sets.filter((s) => !s.isWarmup);
  const warmupSets = sets.filter((s) => s.isWarmup);

  // Compute volume summary
  const volumeSummary = computeVolumeSummary(workingSets);

  return (
    <Card className={styles.exerciseCard}>
      <div
        className={styles.exerciseHeader}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className={styles.exerciseTitleRow}>
          <span className={styles.expandIcon}>{isExpanded ? '▾' : '▸'}</span>
          <h3 className={styles.exerciseName}>{exercise?.name ?? 'Unknown'}</h3>
        </div>
        {volumeSummary && (
          <span className={styles.exerciseStats}>{volumeSummary}</span>
        )}
      </div>
      {isExpanded && (
        <div className={styles.sets}>
          {warmupSets.map((set, index) => (
            <SetDisplay
              key={set.id}
              set={set}
              prs={prsBySetId.get(set.id) ?? []}
              setNumber={index + 1}
            />
          ))}
          {workingSets.map((set, index) => (
            <SetDisplay
              key={set.id}
              set={set}
              prs={prsBySetId.get(set.id) ?? []}
              setNumber={index + 1}
            />
          ))}
        </div>
      )}
      {isExpanded && sessionExercise.notes && (
        <div className={styles.exerciseNotes}>
          <strong>Notes:</strong> {sessionExercise.notes}
        </div>
      )}
    </Card>
  );
}

interface SessionDetailProps {
  sessionId: string;
}

export function SessionDetail({ sessionId }: SessionDetailProps) {
  const navigate = useNavigate();
  const session = useSession(sessionId);
  const sessionExercises = useSessionExercises(sessionId) ?? [];
  const routine = useRoutine(session?.routineId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const activeSession = useActiveSession();
  // v1.4.1: Get ALL PRs for this session in one query (fixes blank page bug)
  const sessionPRs = usePRsForSession(sessionId);

  // Create a map of setId -> PRs for quick lookup
  const prsBySetId = useMemo(() => {
    const map = new Map<string, PR[]>();
    if (sessionPRs) {
      for (const pr of sessionPRs) {
        const existing = map.get(pr.setId) ?? [];
        existing.push(pr);
        map.set(pr.setId, existing);
      }
    }
    return map;
  }, [sessionPRs]);

  // Group exercises for display
  const sortedExercises = useMemo(() => {
    return [...sessionExercises].sort((a, b) => a.order - b.order);
  }, [sessionExercises]);

  if (!session) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteSession(sessionId);
    navigate('/history');
  };

  const handleRepeat = async () => {
    setIsRepeating(true);
    try {
      await repeatSession(sessionId);
      navigate('/workout');
    } finally {
      setIsRepeating(false);
    }
  };

return (
    <div className={styles.container}>
        <header className={styles.header}>
            <Button variant="ghost" onClick={() => navigate('/history')}>
                ← Back
            </Button>
            <div className={styles.headerContent}>
                <h1 className={styles.title}>{routine?.name ?? 'Workout'}</h1>
                <div className={styles.meta}>
                        <span>{formatDate(session.startedAt)}</span>
                        <span>{formatTime(session.startedAt)}</span>
                        <span className={session.completedAt ? styles.completed : styles.incomplete}>
                        {formatDuration(session.startedAt, session.completedAt)}
                        </span>
                </div>
            </div>
            <div className={styles.actions}>
                {!activeSession && (
                  <Button variant="primary" onClick={handleRepeat} disabled={isRepeating}>
                    {isRepeating ? 'Starting...' : 'Repeat'}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => navigate(`/history/${sessionId}/edit`)}>
                    Edit
                </Button>
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                    Delete
                </Button>
            </div>
        </header>

      {session.notes && (
        <div className={styles.notes}>
          <strong>Notes:</strong> {session.notes}
        </div>
      )}

      <div className={styles.exercises}>
        {sortedExercises.map((se) => (
          <ExerciseDisplay key={se.id} sessionExercise={se} prsBySetId={prsBySetId} />
        ))}
        {sortedExercises.length === 0 && (
          <p className={styles.empty}>No exercises logged.</p>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Session"
        message="Permanently delete this workout session? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
