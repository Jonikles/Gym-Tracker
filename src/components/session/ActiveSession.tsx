import { useState, useCallback, useMemo, useEffect } from 'react';
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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

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

  // Clear validation message when sets change (user is filling fields)
  useEffect(() => {
    if (showValidation) {
      setShowValidation(false);
      setValidationMessage(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSets.length, allSets.map(s => `${s.weight}-${s.reps}-${s.time}-${s.distance}`).join(',')]);

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
    if (!exerciseFieldsMap || sessionExercises.length === 0) {
      setShowCompleteConfirm(true);
      return;
    }

    // Check every set against its exercise's required fields
    let hasEmpty = false;
    for (const se of sessionExercises) {
      const fields = exerciseFieldsMap.get(se.exerciseId) ?? ['weight', 'reps'];
      const setsForExercise = allSets.filter((s) => s.sessionExerciseId === se.id);

      for (const set of setsForExercise) {
        for (const field of fields) {
          if (field === 'weight' && (set.weight === undefined || set.weight === null)) hasEmpty = true;
          if (field === 'reps' && (set.reps === undefined || set.reps === null)) hasEmpty = true;
          if (field === 'time' && (set.time === undefined || set.time === null)) hasEmpty = true;
          if (field === 'distance' && (set.distance === undefined || set.distance === null)) hasEmpty = true;
        }
      }
    }

    if (hasEmpty) {
      setShowValidation(true);
      setValidationMessage('Fill in all set fields before completing');
      return;
    }

    setShowValidation(false);
    setValidationMessage(null);
    setShowCompleteConfirm(true);
  }, [exerciseFieldsMap, sessionExercises, allSets]);

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
            <span>{new Date(activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className={styles.timer}>{formatTime(elapsed)}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
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
        <div className={styles.validationMessage}>{validationMessage}</div>
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
    </div>
  );
}
