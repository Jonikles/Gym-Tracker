import { useMemo, useState } from 'react';
import { MoreMenu, MoreMenuItem } from './MoreMenu';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Card, ConfirmDialog } from '../common';
import { deleteSession, repeatSession, useSession, useSessionExercises } from '../../hooks/useSessions';
import { useSessionContext } from '../../context/useSessionContext';
import { useRoutine } from '../../hooks/useRoutines';
import { useSets, useSessionSets } from '../../hooks/useSets';
import { useExercise } from '../../hooks/useExercises';
import { usePRsForSession } from '../../hooks/usePRs';
import { db } from '../../db';
import { formatPRType } from '../../utils/pr';
import { getSetVolume } from '../../utils/volume';
import { formatLongDate, formatTime, formatDuration, formatVolume } from '../common/format';
import type { SessionExercise as SessionExerciseType, Set, PR } from '../../types';

/** Stable fallback while live queries load, so memo deps don't change every render */
const NO_EXERCISES: SessionExerciseType[] = [];
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
/** Extra detail for technique sets, e.g. drops "→ 80kg × 6", myo mini-sets "+ 4 + 3" */
function formatTechniqueDetail(set: Set): string | null {
  const td = set.techniqueData;
  if (!td) return null;
  if (set.intensityTechnique === 'dropset' && 'drops' in td && td.drops.length > 1) {
    return td.drops.slice(1).map((d) => `→ ${d.weight}kg × ${d.reps}`).join(' ');
  }
  if (set.intensityTechnique === 'myoreps' && 'miniSets' in td && td.miniSets.length > 0) {
    return td.miniSets.map((r) => `+ ${r}`).join(' ');
  }
  if (set.intensityTechnique === 'partials' && 'partialReps' in td && td.partialReps > 0) {
    const atWeight = td.partialWeight && td.partialWeight !== set.weight ? ` @ ${td.partialWeight}kg` : '';
    return `+ ${td.partialReps} partials${atWeight}`;
  }
  return null;
}

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
      <span className={styles.setNumber} title={set.isWarmup ? `Warmup ${setNumber}` : undefined}>
        {set.isWarmup ? 'W' : setNumber}
      </span>
      <span className={`num ${styles.setData}`}>
        {formatSetData(set)}
        {formatTechniqueDetail(set) && <> {formatTechniqueDetail(set)}</>}
        {set.intensityTechnique && set.intensityTechnique !== 'standard' && (
          <span className={styles.technique}> ({set.intensityTechnique})</span>
        )}
      </span>
      {prs.length > 0 && (
        <div className={styles.prBadges}>
          {prs.map((pr) => (
            <span key={pr.id} className={`chip ${styles.prBadge} ${styles[pr.type]}`}>
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
          <span className={`num ${styles.exerciseStats}`}>{volumeSummary}</span>
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
  const sessionExercises = useSessionExercises(sessionId) ?? NO_EXERCISES;
  const routine = useRoutine(session?.routineId);
  const templateId = session?.templateId;
  const templateName = useLiveQuery(
    async () => (templateId ? (await db.templates.get(templateId))?.name : undefined),
    [templateId]
  );
  const allSets = useSessionSets(sessionId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const { activeSession } = useSessionContext();
  // Get ALL PRs for this session in one query
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

  // Stat tiles: duration · exercises · sets · volume
  const summaryTiles: { value: string; label: string; status?: string }[] = [
    {
      value: formatDuration(session.startedAt, session.completedAt),
      label: 'Duration',
      status: session.completedAt ? styles.completed : styles.incomplete,
    },
    { value: String(sortedExercises.length), label: sortedExercises.length === 1 ? 'Exercise' : 'Exercises' },
    { value: String(summary.setCount), label: summary.setCount === 1 ? 'Set' : 'Sets' },
  ];
  if (summary.volume > 0) {
    summaryTiles.push({ value: formatVolume(summary.volume).replace(/kg$/, ''), label: 'Volume (kg)' });
  }

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
            <MoreMenu>
              {(close) => (
                <>
                  <MoreMenuItem onClick={() => { close(); navigate(`/history/${sessionId}/edit`); }}>
                    Edit
                  </MoreMenuItem>
                  <MoreMenuItem danger onClick={() => { close(); setShowDeleteConfirm(true); }}>
                    Delete
                  </MoreMenuItem>
                </>
              )}
            </MoreMenu>
          </div>
        </div>
        <span className={`eyebrow num ${styles.meta}`}>
          {formatLongDate(session.startedAt)} · {formatTime(session.startedAt)}
        </span>
        <h1 className={`page-title ${styles.title}`}>{title}</h1>
      </header>

      <div className={styles.summary}>
        {summaryTiles.map((tile) => (
          <div key={tile.label} className={styles.summaryTile}>
            <span className={`${styles.summaryValue} ${tile.status ?? ''}`}>{tile.value}</span>
            <span className="stat-label">{tile.label}</span>
          </div>
        ))}
      </div>

      {session.notes && (
        <div className={styles.notes}>
          <span className="eyebrow">Notes</span>
          <p className={styles.notesText}>{session.notes}</p>
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
