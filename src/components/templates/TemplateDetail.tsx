import { useState } from 'react';
import { MoreMenu, MoreMenuItem } from '../history/MoreMenu';
import { useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, ConfirmDialog, Modal, SkeletonList } from '../common';
import { db } from '../../db';
import {
  duplicateTemplate,
  deleteTemplate,
  getRoutinesUsingTemplate,
} from '../../hooks/useTemplates';
import { startSessionFromTemplate } from '../../hooks/useSessions';
import { useSessionContext } from '../../context/useSessionContext';
import { PROGRESSION_MAP } from '../../data/progressions';
import type { TemplateExercise, Routine, Exercise } from '../../types';
import styles from './TemplateDetail.module.css';

function ExerciseSummary({
  exercise,
  exerciseData,
}: {
  exercise: TemplateExercise;
  /** undefined = still loading, null = exercise no longer exists */
  exerciseData: Exercise | null | undefined;
}) {
  const isProgression = !!exercise.progressionId;
  const progressionDef = isProgression ? PROGRESSION_MAP[exercise.progressionId!] : null;

  // Summarize sets info
  const setCount = exercise.sets.length;
  const warmupCount = exercise.sets.filter(s => s.isWarmup).length;
  const targetReps = exercise.targetReps;

  // Check for non-standard techniques
  const techniques = [...new Set(exercise.sets.map(s => s.intensityTechnique).filter(t => t !== 'standard'))];

  const isMissing = !progressionDef && exerciseData === null;
  const displayName = progressionDef
    ? progressionDef.name
    : exerciseData === undefined
      ? '…'
      : exerciseData?.name ?? 'Exercise missing';

  return (
    <div className={styles.exerciseSummary}>
      <span className={`${styles.exerciseName} ${isMissing ? styles.exerciseMissing : ''}`}>
        {isProgression && <span className={`chip chip-accent ${styles.progressionTag}`}>Progression</span>}
        {displayName}
      </span>
      <span className={`num ${styles.exerciseDetail}`}>
        {setCount} sets × {targetReps}
        {warmupCount > 0 && ` (${warmupCount} warmup)`}
        {exercise.weight && ` @ ${exercise.weight}kg`}
        {techniques.map(t => (
          <span key={t} className={`chip ${styles.technique}`}>{t}</span>
        ))}
      </span>
    </div>
  );
}

interface TemplateDetailProps {
  templateId: string;
}

export function TemplateDetail({ templateId }: TemplateDetailProps) {
  const navigate = useNavigate();
  const { activeSession, importTemplate } = useSessionContext();

  // undefined = loading, null = not found
  const template = useLiveQuery(
    () => db.templates.get(templateId).then((t) => t ?? null),
    [templateId]
  );

  // Batch-fetch every exercise referenced by this template in one query
  const exerciseIdsKey = template ? template.exercises.map((e) => e.exerciseId).join(',') : '';
  const exerciseMap = useLiveQuery(async () => {
    const ids = exerciseIdsKey ? exerciseIdsKey.split(',') : [];
    const exercises = await db.exercises.bulkGet(ids);
    const map = new Map<string, Exercise>();
    for (const ex of exercises) if (ex) map.set(ex.id, ex);
    return map;
  }, [exerciseIdsKey]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRoutineWarning, setShowRoutineWarning] = useState(false);
  const [affectedRoutines, setAffectedRoutines] = useState<Routine[]>([]);
  const [showActiveWorkoutPrompt, setShowActiveWorkoutPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (template === undefined) {
    return (
      <div className={styles.container}>
        <SkeletonList count={4} lines={2} />
      </div>
    );
  }

  if (template === null) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Template not found. It may have been deleted.</p>
        <Button variant="secondary" onClick={() => navigate('/templates')}>
          Back to Templates
        </Button>
      </div>
    );
  }

  /** Run an action with a busy flag and a visible error if it throws */
  const runAction = async (label: string, action: () => Promise<void>) => {
    if (busy) return;
    setActionError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      console.error(`${label} failed:`, err);
      setActionError(err instanceof Error ? err.message : `${label} failed`);
    } finally {
      setBusy(false);
    }
  };

  const handleStartWorkout = () => {
    if (activeSession) {
      setShowActiveWorkoutPrompt(true);
      return;
    }
    runAction('Start workout', async () => {
      await startSessionFromTemplate(templateId);
      navigate('/workout');
    });
  };

  const handleAddToActiveWorkout = async () => {
    await importTemplate(templateId);
    navigate('/workout');
  };

  const handleDuplicate = () =>
    runAction('Duplicate', async () => {
      const newId = await duplicateTemplate(templateId);
      navigate(`/templates/${newId}`);
    });

  const handleDeleteClick = () =>
    runAction('Delete', async () => {
      // Check if any routines use this template
      const routines = await getRoutinesUsingTemplate(templateId);
      if (routines.length > 0) {
        setAffectedRoutines(routines);
        setShowRoutineWarning(true);
      } else {
        setShowDeleteConfirm(true);
      }
    });

  // Throws are caught and shown by ConfirmDialog
  const handleDeleteConfirm = async () => {
    await deleteTemplate(templateId);
    navigate('/templates');
  };

  const sortedExercises = [...template.exercises].sort((a, b) => a.order - b.order);
  const totalSets = template.exercises.reduce((sum, e) => sum + e.sets.length, 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Button variant="ghost" className={styles.backBtn} onClick={() => navigate('/templates')}>
            ← Back
          </Button>
          <MoreMenu>
            {(close) => (
              <>
                <MoreMenuItem onClick={() => { close(); navigate(`/templates/${template.id}/edit`); }}>
                  Edit
                </MoreMenuItem>
                <MoreMenuItem onClick={() => { close(); handleDuplicate(); }}>
                  Duplicate
                </MoreMenuItem>
                <MoreMenuItem danger onClick={() => { close(); handleDeleteClick(); }}>
                  Delete
                </MoreMenuItem>
              </>
            )}
          </MoreMenu>
        </div>
        <div className={`surface-hero ${styles.hero}`}>
        <div className={styles.headerContent}>
          <span className="eyebrow">Template</span>
          <h1 className={`page-title ${styles.title}`}>{template.name}</h1>
          <div className={styles.meta}>
            <span>
              <span className={`num ${styles.metaValue}`}>{template.exercises.length}</span> exercises
            </span>
            <span>
              <span className={`num ${styles.metaValue}`}>{totalSets}</span> total sets
            </span>
          </div>
        </div>
        <Button
          size="lg"
          className={styles.startBtn}
          onClick={handleStartWorkout}
          disabled={busy || template.exercises.length === 0}
        >
          Start Workout
        </Button>
        {actionError && (
          <p className={styles.actionError} role="alert">
            {actionError}
          </p>
        )}
        </div>
      </header>

      <div className={styles.exercises}>
        <h2 className="section-title">Exercises</h2>
        <div className={styles.exerciseList}>
          {sortedExercises.map((exercise, index) => (
            <div
              key={`${exercise.exerciseId}-${exercise.progressionId ?? ''}-${exercise.order}`}
              className={styles.exerciseRow}
            >
              <span className={styles.exerciseNumber}>{index + 1}</span>
              <ExerciseSummary
                exercise={exercise}
                exerciseData={exerciseMap ? exerciseMap.get(exercise.exerciseId) ?? null : undefined}
              />
            </div>
          ))}
          {template.exercises.length === 0 && (
            <p className={styles.empty}>No exercises in this template.</p>
          )}
        </div>
      </div>

      {/* A workout is already running — offer to add to it or resume it */}
      <Modal
        isOpen={showActiveWorkoutPrompt}
        onClose={() => setShowActiveWorkoutPrompt(false)}
        title="Workout in Progress"
      >
        <div className={styles.routineWarning}>
          <p className={styles.warningText}>
            You already have a workout in progress. Finish it before starting a new one, or add
            &ldquo;{template.name}&rdquo;&rsquo;s exercises to the current workout.
          </p>
          <div className={styles.warningActions}>
            <Button variant="secondary" onClick={() => setShowActiveWorkoutPrompt(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setShowActiveWorkoutPrompt(false); navigate('/workout'); }}
            >
              Resume Current
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setShowActiveWorkoutPrompt(false);
                runAction('Add to workout', handleAddToActiveWorkout);
              }}
            >
              Add to Current
            </Button>
          </div>
        </div>
      </Modal>

      {/* Routine warning dialog — shows affected routines with clickable links */}
      <Modal
        isOpen={showRoutineWarning}
        onClose={() => setShowRoutineWarning(false)}
        title="Template Used in Routines"
      >
        <div className={styles.routineWarning}>
          <p className={styles.warningText}>
            &ldquo;{template.name}&rdquo; is used in the following routines. Deleting it will remove it from these routines and set those days as rest days.
          </p>
          <div className={styles.routineList}>
            {affectedRoutines.map((routine) => (
              <Link
                key={routine.id}
                to={`/routines/${routine.id}`}
                className={styles.routineLink}
                onClick={() => setShowRoutineWarning(false)}
              >
                {routine.name}
              </Link>
            ))}
          </div>
          <div className={styles.warningActions}>
            <Button variant="secondary" onClick={() => setShowRoutineWarning(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                setShowRoutineWarning(false);
                runAction('Delete', handleDeleteConfirm);
              }}
            >
              Delete Anyway
            </Button>
          </div>
        </div>
      </Modal>

      {/* Simple delete confirm — no routines affected */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Template"
        message={`Permanently delete "${template.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
