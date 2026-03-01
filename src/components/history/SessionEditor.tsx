import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, ConfirmDialog } from '../common';
import { ExercisePicker } from '../exercises';
import { SetRow } from '../session/SetRow';
import {
  useSession,
  useSessionExercises,
  updateSessionNotes,
  updateSessionTimes,
  addExerciseToSession,
  removeExerciseFromSession,
  deleteSession,
} from '../../hooks/useSessions';
import { useSets, createSet } from '../../hooks/useSets';
import { useExercise } from '../../hooks/useExercises';
import { useRoutine } from '../../hooks/useRoutines';
import type { SessionExercise as SessionExerciseType, Exercise, ExerciseField } from '../../types';
import styles from './SessionEditor.module.css';

/** Convert a timestamp to a datetime-local input value (YYYY-MM-DDTHH:MM) */
function timestampToDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** Convert a datetime-local input value back to timestamp */
function datetimeLocalToTimestamp(val: string): number {
  return new Date(val).getTime();
}

function EditableExercise({
  sessionExercise,
  onRemove,
}: {
  sessionExercise: SessionExerciseType;
  onRemove: () => void;
}) {
  const exercise = useExercise(sessionExercise.exerciseId);
  const sets = useSets(sessionExercise.id) ?? [];
  const defaultFields: ExerciseField[] = exercise?.defaultFields ?? ['weight', 'reps'];

  const handleAddSet = async () => {
    const lastSet = sets[sets.length - 1];
    await createSet({
      sessionExerciseId: sessionExercise.id,
      weight: lastSet?.weight,
      reps: lastSet?.reps,
      isWarmup: false,
    });
  };

  let workingSetNumber = 0;

  return (
    <div className={styles.exerciseCard}>
      <div className={styles.exerciseHeader}>
        <h3 className={styles.exerciseName}>{exercise?.name ?? 'Unknown'}</h3>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
      <div className={styles.sets}>
        {sets.map((set) => {
          if (!set.isWarmup) workingSetNumber++;
          return (
            <SetRow
              key={set.id}
              set={set}
              setNumber={workingSetNumber}
              defaultFields={defaultFields}
              exerciseId={sessionExercise.exerciseId}
              onDelete={() => {}}
            />
          );
        })}
      </div>
      <Button variant="secondary" size="sm" onClick={handleAddSet}>
        + Add Set
      </Button>
    </div>
  );
}

interface SessionEditorProps {
  sessionId: string;
}

export function SessionEditor({ sessionId }: SessionEditorProps) {
  const navigate = useNavigate();
  const session = useSession(sessionId);
  const sessionExercises = useSessionExercises(sessionId) ?? [];
  const routine = useRoutine(session?.routineId);

  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Sync local state when session loads from DB (fixes notes not pre-filling)
  useEffect(() => {
    if (session && !hasInitialized) {
      setNotes(session.notes ?? '');
      setStartTime(timestampToDatetimeLocal(session.startedAt));
      if (session.completedAt) {
        setEndTime(timestampToDatetimeLocal(session.completedAt));
      }
      setHasInitialized(true);
    }
  }, [session, hasInitialized]);

  const sortedExercises = useMemo(() => {
    return [...sessionExercises].sort((a, b) => a.order - b.order);
  }, [sessionExercises]);

  const handleNotesChange = async (newNotes: string) => {
    setNotes(newNotes);
    if (session) {
      await updateSessionNotes(session.id, newNotes);
    }
  };

  const handleStartTimeChange = async (value: string) => {
    setStartTime(value);
    if (session && value) {
      await updateSessionTimes(session.id, { startedAt: datetimeLocalToTimestamp(value) });
    }
  };

  const handleEndTimeChange = async (value: string) => {
    setEndTime(value);
    if (session && value) {
      await updateSessionTimes(session.id, { completedAt: datetimeLocalToTimestamp(value) });
    }
  };

  const handleAddExercise = async (exercise: Exercise) => {
    await addExerciseToSession(sessionId, exercise.id);
    setIsPickerOpen(false);
  };

  const handleRemoveExercise = async (sessionExerciseId: string) => {
    await removeExerciseFromSession(sessionExerciseId);
  };

  const handleDelete = async () => {
    await deleteSession(sessionId);
    navigate('/history');
  };

  if (!session) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  const existingExerciseIds = sessionExercises.map((e) => e.exerciseId);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button variant="ghost" onClick={() => navigate(`/history/${sessionId}`)}>
          ← Back
        </Button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Edit: {routine?.name ?? 'Workout'}</h1>
        </div>
        <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
          Delete
        </Button>
      </header>

      <div className={styles.timeSection}>
        <div className={styles.timeField}>
          <label className={styles.timeLabel}>Started at</label>
          <Input
            type="datetime-local"
            value={startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
          />
        </div>
        <div className={styles.timeField}>
          <label className={styles.timeLabel}>Completed at</label>
          <Input
            type="datetime-local"
            value={endTime}
            onChange={(e) => handleEndTimeChange(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.notesSection}>
        <Input
          label="Session Notes"
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add notes about this session..."
        />
      </div>

      <div className={styles.exercises}>
        {sortedExercises.map((se) => (
          <EditableExercise
            key={se.id}
            sessionExercise={se}
            onRemove={() => handleRemoveExercise(se.id)}
          />
        ))}
      </div>

      <Button
        variant="secondary"
        onClick={() => setIsPickerOpen(true)}
        className={styles.addExercise}
      >
        + Add Exercise
      </Button>

      <ExercisePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAddExercise}
        excludeIds={existingExerciseIds}
        title="Add Exercise"
      />

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
