import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Button, ConfirmDialog, Modal } from '../common';
import { ExercisePicker } from '../exercises';
import { SessionExercise } from './SessionExercise';
import { ExerciseGroup } from './ExerciseGroup';
import { useSessionContext } from '../../context/SessionContext';
import { useRoutine } from '../../hooks/useRoutines';
import { useTemplates } from '../../hooks/useTemplates';
import { useSessionSets } from '../../hooks/useSets';
import { updateSessionNotes } from '../../hooks/useSessions';
import type { TemplateExercise, ExerciseField } from '../../types';
import styles from './ActiveSession.module.css';

// Helper to format elapsed time
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ActiveSession() {
  const {
    activeSession,
    sessionExercises,
    isLoading,
    complete,
    abandon,
    importTemplate,
    addExercise,
    removeExercise,
    reorderExercises,
  } = useSessionContext();

  const routine = useRoutine(activeSession?.routineId);
  const allTemplates = useTemplates() ?? [];

  // Get template if session has one
  const template = useLiveQuery(
    async () => {
      if (!activeSession?.templateId) return undefined;
      return db.templates.get(activeSession.templateId);
    },
    [activeSession?.templateId]
  );

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState(activeSession?.notes ?? '');
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  // Track which type of validation error is active: 'no-exercises' | 'no-sets' | 'empty-fields' | null
  const [validationType, setValidationType] = useState<string | null>(null);

  // Get all sets for validation
  const allSets = useSessionSets(activeSession?.id) ?? [];

  // Build exerciseId -> defaultFields map for validation
  const exerciseFieldsMap = useLiveQuery(
    async () => {
      const exerciseIds = [...new Set(sessionExercises.map((se) => se.exerciseId))];
      const exercises = await db.exercises.bulkGet(exerciseIds);
      const map = new Map<string, ExerciseField[]>();
      for (const ex of exercises) {
        if (ex) map.set(ex.id, ex.defaultFields ?? ['weight', 'reps']);
      }
      return map;
    },
    [sessionExercises.map((se) => se.exerciseId).join(',')]
  );

  // Dismiss handler for the X button — always clears regardless of type
  const dismissValidation = useCallback(() => {
    setShowValidation(false);
    setValidationMessage(null);
    setValidationType(null);
  }, []);

  // Auto-dismiss "no-exercises" error when an exercise is added
  useEffect(() => {
    if (validationType === 'no-exercises' && sessionExercises.length > 0) {
      dismissValidation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionExercises.length]);

  // Auto-dismiss "no-sets" error when ALL exercises have at least one set
  useEffect(() => {
    if (validationType !== 'no-sets' || sessionExercises.length === 0) return;

    const allHaveSets = sessionExercises.every(
      (se) => allSets.some((s) => s.sessionExerciseId === se.id)
    );
    if (allHaveSets) {
      dismissValidation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSets.length]);

  // Auto-dismiss "empty-fields" error only when ALL fields are actually filled
  const setsFieldSignature = allSets.map(s => `${s.weight}-${s.reps}-${s.time}-${s.distance}`).join(',');
  useEffect(() => {
    if (validationType !== 'empty-fields' || !exerciseFieldsMap) return;

    // Re-check: are all fields now filled?
    let stillHasEmpty = false;
    for (const se of sessionExercises) {
      const fields = exerciseFieldsMap.get(se.exerciseId) ?? ['weight', 'reps'];
      const setsForExercise = allSets.filter((s) => s.sessionExerciseId === se.id);
      for (const set of setsForExercise) {
        for (const field of fields) {
          if (field === 'weight' && (set.weight === undefined || set.weight === null)) stillHasEmpty = true;
          if (field === 'reps' && (set.reps === undefined || set.reps === null)) stillHasEmpty = true;
          if (field === 'time' && (set.time === undefined || set.time === null)) stillHasEmpty = true;
          if (field === 'distance' && (set.distance === undefined || set.distance === null)) stillHasEmpty = true;
        }
      }
    }

    if (!stillHasEmpty) {
      dismissValidation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setsFieldSignature]);

  // Running timer
  useEffect(() => {
    if (!activeSession) return;

    // Initialize elapsed time
    setElapsed(Math.floor((Date.now() - activeSession.startedAt) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeSession.startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession?.startedAt]);

  // Create a map of exerciseId -> TemplateExercise for quick lookup
  const templateExerciseMap = useMemo(() => {
    const map = new Map<string, TemplateExercise>();
    if (template?.exercises) {
      for (const te of template.exercises) {
        map.set(te.exerciseId, te);
      }
    }
    return map;
  }, [template?.exercises]);

  // Group exercises for rendering
  const groupedExercises = useMemo(() => {
    const sorted = [...sessionExercises].sort((a, b) => a.order - b.order);
    const groups: { type: 'single' | 'group'; exercises: typeof sorted; groupId?: string; groupType?: 'superset' | 'circuit' }[] = [];
    const processedGroupIds = new Set<string>();

    for (const exercise of sorted) {
      if (exercise.groupId) {
        if (processedGroupIds.has(exercise.groupId)) continue;
        processedGroupIds.add(exercise.groupId);

        const groupExercises = sorted.filter((e) => e.groupId === exercise.groupId);
        groups.push({
          type: 'group',
          exercises: groupExercises,
          groupId: exercise.groupId,
          groupType: exercise.groupType,
        });
      } else {
        groups.push({
          type: 'single',
          exercises: [exercise],
        });
      }
    }

    return groups;
  }, [sessionExercises]);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!draggedId || draggedId === targetId) {
        setDraggedId(null);
        return;
      }

      const currentOrder = sessionExercises
        .filter((e) => !e.groupId) // Only reorder non-grouped exercises for now
        .sort((a, b) => a.order - b.order)
        .map((e) => e.id);

      const draggedIndex = currentOrder.indexOf(draggedId);
      const targetIndex = currentOrder.indexOf(targetId);

      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedId(null);
        return;
      }

      currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(targetIndex, 0, draggedId);

      reorderExercises(currentOrder);
      setDraggedId(null);
    },
    [draggedId, sessionExercises, reorderExercises]
  );

  // Handle complete button click — validate all sets have required fields filled
  const handleCompleteClick = useCallback(() => {
    // Block completing an empty workout
    if (sessionExercises.length === 0) {
      setShowValidation(true);
      setValidationMessage('Add at least one exercise before completing');
      setValidationType('no-exercises');
      return;
    }

    if (!exerciseFieldsMap) {
      return; // Fields map still loading, do nothing
    }

    // Check every exercise has at least one set, and every set has required fields filled
    let hasEmpty = false;
    let hasExerciseWithNoSets = false;
    for (const se of sessionExercises) {
      const fields = exerciseFieldsMap.get(se.exerciseId) ?? ['weight', 'reps'];
      const setsForExercise = allSets.filter((s) => s.sessionExerciseId === se.id);

      if (setsForExercise.length === 0) {
        hasExerciseWithNoSets = true;
        continue;
      }

      for (const set of setsForExercise) {
        for (const field of fields) {
          if (field === 'weight' && (set.weight === undefined || set.weight === null)) hasEmpty = true;
          if (field === 'reps' && (set.reps === undefined || set.reps === null)) hasEmpty = true;
          if (field === 'time' && (set.time === undefined || set.time === null)) hasEmpty = true;
          if (field === 'distance' && (set.distance === undefined || set.distance === null)) hasEmpty = true;
        }
      }
    }

    if (hasExerciseWithNoSets) {
      setShowValidation(true);
      setValidationMessage('Every exercise needs at least one set');
      setValidationType('no-sets');
      return;
    }

    if (hasEmpty) {
      setShowValidation(true);
      setValidationMessage('Fill in all set fields before completing');
      setValidationType('empty-fields');
      return;
    }

    setShowValidation(false);
    setValidationMessage(null);
    setValidationType(null);
    setShowCompleteConfirm(true);
  }, [exerciseFieldsMap, sessionExercises, allSets]);

  const handleOpenNotes = useCallback(() => {
    setNotes(activeSession?.notes ?? '');
    setShowNotesModal(true);
  }, [activeSession?.notes]);

  const handleSaveNotes = useCallback(async () => {
    if (activeSession) {
      await updateSessionNotes(activeSession.id, notes.trim());
    }
    setShowNotesModal(false);
  }, [activeSession, notes]);

  if (!activeSession) {
    return (
      <div className={styles.empty}>
        <p>No active workout</p>
      </div>
    );
  }

  const existingExerciseIds = sessionExercises.map((e) => e.exerciseId);

  // Title: template name > routine name > "Workout"
  const title = template?.name ?? routine?.name ?? 'Workout';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.meta}>
            <span>Started {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className={styles.timerRow}>
            <span className={styles.timer}>{formatTime(elapsed)}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="ghost"
            onClick={handleOpenNotes}
            disabled={isLoading}
          >
            {activeSession.notes ? '📝' : '📋'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowAbandonConfirm(true)}
            disabled={isLoading}
          >
            Discard
          </Button>
          <Button
            onClick={handleCompleteClick}
            disabled={isLoading}
          >
            Complete
          </Button>
        </div>
      </header>

      {validationMessage && (
        <div className={styles.validationMessage}>
          <span>{validationMessage}</span>
          <button className={styles.validationDismiss} onClick={dismissValidation} title="Dismiss">×</button>
        </div>
      )}

      <div className={styles.exercises}>
        {groupedExercises.map((group) => {
          if (group.type === 'group' && group.groupType) {
            return (
              <ExerciseGroup
                key={group.groupId}
                groupType={group.groupType}
                exercises={group.exercises}
                templateExerciseMap={templateExerciseMap}
                onRemoveExercise={removeExercise}
                showValidation={showValidation}
              />
            );
          }

          const exercise = group.exercises[0];
          const templateExercise = templateExerciseMap.get(exercise.exerciseId);
          
          return (
            <SessionExercise
              key={exercise.id}
              sessionExercise={exercise}
              templateExercise={templateExercise}
              onRemove={() => removeExercise(exercise.id)}
              isDragging={draggedId === exercise.id}
              onDragStart={() => handleDragStart(exercise.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(exercise.id)}
              showValidation={showValidation}
            />
          );
        })}
      </div>

      <div className={styles.addExercise}>
        <Button
          variant="secondary"
          onClick={() => setIsPickerOpen(true)}
          className={styles.addButton}
        >
          + Add Exercise
        </Button>
        {/* Import Template button - only show for blank workouts without a template */}
        {!template && sessionExercises.length === 0 && (
          <Button
            variant="ghost"
            onClick={() => setIsTemplatePickerOpen(true)}
            className={styles.addButton}
          >
            Import Template
          </Button>
        )}
      </div>

      <ExercisePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={addExercise}
        excludeIds={existingExerciseIds}
        title="Add Exercise"
      />

      {/* Template Picker Modal */}
      <Modal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        title="Import Template"
      >
        <div className={styles.templateList}>
          {allTemplates.map((t) => (
            <button
              key={t.id}
              className={styles.templateItem}
              onClick={async () => {
                await importTemplate(t.id);
                setIsTemplatePickerOpen(false);
              }}
            >
              <span className={styles.templateName}>{t.name}</span>
              <span className={styles.templateMeta}>
                {t.exercises.length} exercises · {t.exercises.reduce((sum, e) => sum + e.sets.length, 0)} sets
              </span>
            </button>
          ))}
          {allTemplates.length === 0 && (
            <p className={styles.emptyTemplates}>No templates available</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        onConfirm={complete}
        title="Complete Workout"
        message="Mark this workout as complete? This will save all your sets."
        confirmLabel="Complete"
      />

      <ConfirmDialog
        isOpen={showAbandonConfirm}
        onClose={() => setShowAbandonConfirm(false)}
        onConfirm={abandon}
        title="Discard Workout"
        message="Discard this workout? All logged sets will be permanently deleted."
        confirmLabel="Discard"
        variant="danger"
      />

      {/* Workout Notes Modal */}
      <Modal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        title="Workout Notes"
      >
        <div className={styles.notesModal}>
          <textarea
            ref={notesTextareaRef}
            className={styles.notesTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did the workout feel? Any observations..."
            rows={5}
            autoFocus
          />
          <div className={styles.notesActions}>
            <Button variant="secondary" onClick={() => setShowNotesModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>
              Save Notes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
