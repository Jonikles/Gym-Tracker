import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, ConfirmDialog } from '../common';
import { deleteSession, useSession, useSessionExercises } from '../../hooks/useSessions';
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

// v1.4.1: Receive PRs as prop instead of calling hook per-set
// v1.4.2: Added setNumber prop
function SetDisplay({ set, prs, setNumber }: { set: Set; prs: PR[]; setNumber: number }) {
  return (
    <div className={`${styles.set} ${set.isWarmup ? styles.warmup : ''}`}>
      <span className={styles.setNumber}>{setNumber}</span>
      <span className={styles.setLabel}>{set.isWarmup ? 'W' : ''}</span>
      <span className={styles.setData}>
        {set.weight !== undefined && `${set.weight}kg`}
        {set.weight !== undefined && set.reps !== undefined && ' × '}
        {set.reps !== undefined && `${set.reps}`}
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

  const workingSets = sets.filter((s) => !s.isWarmup);
  const warmupSets = sets.filter((s) => s.isWarmup);

  // Calculate volume
  const volume = workingSets.reduce((sum, s) => {
    return sum + (s.weight ?? 0) * (s.reps ?? 0);
  }, 0);

  return (
    <Card className={styles.exerciseCard}>
      <div className={styles.exerciseHeader}>
        <h3 className={styles.exerciseName}>{exercise?.name ?? 'Unknown'}</h3>
        <span className={styles.exerciseStats}>
          {workingSets.length} sets · {volume.toLocaleString()}kg vol
        </span>
      </div>
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
