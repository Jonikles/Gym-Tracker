import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Card, ConfirmDialog } from '../common';
import { deleteSession, repeatSession, useSession, useSessionExercises } from '../../hooks/useSessions';
import { useSessionContext } from '../../context/SessionContext';
import { useRoutine } from '../../hooks/useRoutines';
import { useSets, useSessionSets } from '../../hooks/useSets';
import { useExercise } from '../../hooks/useExercises';
import { usePRsForSession } from '../../hooks/usePRs';
import { db } from '../../db';
import { formatPRType } from '../../utils/pr';
import { getSetVolume } from '../../utils/volume';
import { formatLongDate, formatTime, formatDuration, formatVolume } from './format';
import type { SessionExercise as SessionExerciseType, Set, PR } from '../../types';
import styles from './SessionDetail.module.css';

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
  // Reps + Time (e.g. AMRAP)
  else if (hasReps && hasTime && !hasWeight) {
    parts.push(`${set.reps} reps in ${formatSeconds(set.time!)}`);
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
  const hasAnyWeight = sets.some((s) => s.weight && s.weight > 0);
  const hasAnyReps = sets.some((s) => s.reps && s.reps > 0);
  const hasAnyTime = sets.some((s) => s.time && s.time > 0);
  const hasAnyDistance = sets.some((s) => s.distance && s.distance > 0);

  // Weight × Reps = total kg volume (technique-aware, matches analytics)
  if (hasAnyWeight && hasAnyReps) {
    const vol = sets.reduce((sum, s) => sum + getSetVolume(s), 0);
    return `${formatVolume(vol)} vol`;
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
              {pr.type === 'progression' ? 'LVL UP' : `${formatPRType(pr.type)} PR`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const templateId = session?.templateId;
  const templateName = useLiveQuery(
    async () => (templateId ? (await db.templates.get(templateId))?.name : undefined),
    [templateId]
  );
  const allSets = useSessionSets(sessionId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const { activeSession } = useSessionContext();
  // Get ALL PRs for this session in one query
  const sessionPRs = usePRsForSession(sessionId);

  // Close the ⋮ menu on outside tap
  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

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

  const sortedExercises = useMemo(() => {
    return [...sessionExercises].sort((a, b) => a.order - b.order);
  }, [sessionExercises]);

  // Summary: working sets + technique-aware volume (same rules as analytics)
  const summary = useMemo(() => {
    const working = (allSets ?? []).filter((s) => !s.isWarmup);
    return {
      setCount: working.length,
      volume: working.reduce((sum, s) => sum + getSetVolume(s), 0),
    };
  }, [allSets]);

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
    if (isRepeating) return;
    setIsRepeating(true);
    try {
      await repeatSession(sessionId);
      navigate('/workout');
    } finally {
      setIsRepeating(false);
    }
  };

  // Same title as the History card
  const routineName = routine?.name;
  const title = routineName && templateName
    ? `${routineName} – ${templateName}`
    : routineName ?? templateName ?? 'Blank Workout';

  const summaryParts = [
    formatDuration(session.startedAt, session.completedAt),
    `${sortedExercises.length} exercise${sortedExercises.length === 1 ? '' : 's'}`,
    `${summary.setCount} set${summary.setCount === 1 ? '' : 's'}`,
  ];
  if (summary.volume > 0) summaryParts.push(formatVolume(summary.volume));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <Button variant="ghost" onClick={() => navigate('/history')} className={styles.backBtn}>
            ← Back
          </Button>
          <div className={styles.actions}>
            {!activeSession && (
              <Button variant="primary" onClick={handleRepeat} disabled={isRepeating} className={styles.actionBtn}>
                {isRepeating ? 'Starting...' : 'Repeat'}
              </Button>
            )}
            <div className={styles.moreMenuWrapper} ref={moreMenuRef}>
              <Button
                variant="ghost"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                title="More options"
                aria-label="More options"
                aria-expanded={showMoreMenu}
                className={styles.moreBtn}
              >
                ⋮
              </Button>
              {showMoreMenu && (
                <div className={styles.moreMenuDropdown}>
                  <button
                    className={styles.moreMenuOption}
                    onClick={() => { setShowMoreMenu(false); navigate(`/history/${sessionId}/edit`); }}
                  >
                    Edit
                  </button>
                  <button
                    className={`${styles.moreMenuOption} ${styles.moreMenuDanger}`}
                    onClick={() => { setShowMoreMenu(false); setShowDeleteConfirm(true); }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.meta}>
          {formatLongDate(session.startedAt)} · {formatTime(session.startedAt)}
        </div>
      </header>

      <div className={styles.summary}>
        {summaryParts.map((part, i) => (
          <span
            key={i}
            className={i === 0 ? (session.completedAt ? styles.completed : styles.incomplete) : undefined}
          >
            {part}
          </span>
        ))}
      </div>

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
