import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Button, ConfirmDialog, Modal } from '../common';
import { ExercisePicker } from '../exercises';
import { SessionExercise } from './SessionExercise';
import { ExerciseGroup } from './ExerciseGroup';
import { PlateCalculator } from './PlateCalculator';
import { flushPendingSaves } from './pendingSaves';
import { groupSetsBySessionExercise, setHasEmptyRequiredField } from './setValidation';
import { formatElapsed, formatTime } from '../history/format';
import { useSessionContext } from '../../context/SessionContext';
import { useUndo } from '../../context/UndoContext';
import { useExercise } from '../../hooks/useExercises';
import { useRoutine } from '../../hooks/useRoutines';
import { useTemplates } from '../../hooks/useTemplates';
import { useSessionSets } from '../../hooks/useSets';
import { updateSessionNotes } from '../../hooks/useSessions';
import type { TemplateExercise, ExerciseField, SessionExercise as SessionExerciseType, Set as SetType } from '../../types';
import styles from './ActiveSession.module.css';

const DEFAULT_FIELDS: ExerciseField[] = ['weight', 'reps'];

/** Running clock — isolated so only this tiny component re-renders every second */
function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startedAt) / 1000));

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className={styles.timer}>{formatElapsed(elapsed)}</span>;
}

/** Lightweight name-only label for select mode */
function ExerciseNameLabel({ exerciseId }: { exerciseId: string }) {
  const exercise = useExercise(exerciseId);
  return <span className={styles.selectExerciseName}>{exercise?.name ?? 'Loading...'}</span>;
}

type ValidationType = 'no-exercises' | 'no-sets' | 'empty-fields';

/** Check all exercises have ≥1 set and every set has its required fields */
function validateWorkout(
  sessionExercises: SessionExerciseType[],
  setsBySE: Map<string, SetType[]>,
  fieldsMap: Map<string, ExerciseField[]>
): ValidationType | null {
  if (sessionExercises.length === 0) return 'no-exercises';
  let hasEmpty = false;
  for (const se of sessionExercises) {
    const sets = setsBySE.get(se.id);
    if (!sets || sets.length === 0) return 'no-sets';
    const fields = fieldsMap.get(se.exerciseId) ?? DEFAULT_FIELDS;
    if (!hasEmpty && sets.some((s) => setHasEmptyRequiredField(s, fields))) hasEmpty = true;
  }
  return hasEmpty ? 'empty-fields' : null;
}

const VALIDATION_MESSAGES: Record<ValidationType, string> = {
  'no-exercises': 'Add at least one exercise before completing',
  'no-sets': 'Every exercise needs at least one set',
  'empty-fields': 'Fill in all set fields before completing',
};

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
    switchProgressionLevel,
    groupExercises,
    ungroupAll,
  } = useSessionContext();
  const { showUndo } = useUndo();

  // Wrap removeExercise with undo support
  const handleRemoveExercise = useCallback(async (sessionExerciseId: string) => {
    // Make sure the snapshot includes edits that are still debouncing
    await flushPendingSaves();
    const se = await db.sessionExercises.get(sessionExerciseId);
    if (!se) return;
    const sets = await db.sets.where('sessionExerciseId').equals(sessionExerciseId).toArray();
    const exercise = await db.exercises.get(se.exerciseId);

    await removeExercise(sessionExerciseId);

    showUndo(`${exercise?.name ?? 'Exercise'} removed`, async () => {
      await db.transaction('rw', db.sessions, db.sessionExercises, db.sets, async () => {
        // Only restore into a workout that is still in progress
        const session = await db.sessions.get(se.sessionId);
        if (!session || session.completedAt != null) return;
        await db.sessionExercises.put(se);
        if (sets.length > 0) await db.sets.bulkPut(sets);
      });
    });
  }, [removeExercise, showUndo]);

  const routine = useRoutine(activeSession?.routineId);
  const allTemplates = useTemplates() ?? [];

  const template = useLiveQuery(
    async () => {
      if (!activeSession?.templateId) return undefined;
      return db.templates.get(activeSession.templateId);
    },
    [activeSession?.templateId]
  );

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isPlateCalcOpen, setIsPlateCalcOpen] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState(activeSession?.notes ?? '');
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [validationType, setValidationType] = useState<ValidationType | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const busyRef = useRef(false);
  const showValidation = validationType !== null;

  const allSets = useSessionSets(activeSession?.id);

  // Group sets by sessionExerciseId once per change (instead of filtering per exercise)
  const setsBySE = useMemo(() => groupSetsBySessionExercise(allSets ?? []), [allSets]);

  // Build exerciseId -> defaultFields map for validation
  const exerciseIdsKey = sessionExercises.map((se) => se.exerciseId).join(',');
  const exerciseFieldsMap = useLiveQuery(
    async () => {
      const exerciseIds = [...new Set(exerciseIdsKey.split(',').filter(Boolean))];
      const exercises = await db.exercises.bulkGet(exerciseIds);
      const map = new Map<string, ExerciseField[]>();
      for (const ex of exercises) {
        if (ex) map.set(ex.id, ex.defaultFields ?? DEFAULT_FIELDS);
      }
      return map;
    },
    [exerciseIdsKey]
  );

  const dismissValidation = useCallback(() => setValidationType(null), []);

  // Auto-dismiss the validation banner once the problem it reports is fixed
  useEffect(() => {
    if (!validationType || !exerciseFieldsMap || !allSets) return;
    const current = validateWorkout(sessionExercises, setsBySE, exerciseFieldsMap);
    if (validationType === 'no-exercises' && current !== 'no-exercises') setValidationType(null);
    else if (validationType === 'no-sets' && current !== 'no-sets' && current !== 'no-exercises') setValidationType(null);
    else if (validationType === 'empty-fields' && current === null) setValidationType(null);
  }, [validationType, sessionExercises, setsBySE, exerciseFieldsMap, allSets]);

  // Create a map for template exercise lookup.
  // Keys by exerciseId AND by progressionId (prefixed with "prog:") for progression slots.
  const templateExerciseMap = useMemo(() => {
    const map = new Map<string, TemplateExercise>();
    if (template?.exercises) {
      for (const te of template.exercises) {
        map.set(te.exerciseId, te);
        if (te.progressionId) {
          map.set(`prog:${te.progressionId}`, te);
        }
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
        groups.push({
          type: 'group',
          exercises: sorted.filter((e) => e.groupId === exercise.groupId),
          groupId: exercise.groupId,
          groupType: exercise.groupType,
        });
      } else {
        groups.push({ type: 'single', exercises: [exercise] });
      }
    }

    return groups;
  }, [sessionExercises]);

  // Only non-grouped exercises can be reordered (groups aren't reorderable yet)
  const standaloneOrder = useMemo(
    () =>
      sessionExercises
        .filter((e) => !e.groupId)
        .sort((a, b) => a.order - b.order)
        .map((e) => e.id),
    [sessionExercises]
  );

  // Read the latest order through a ref so the callback stays stable for memoized cards
  const standaloneOrderRef = useRef(standaloneOrder);
  useEffect(() => {
    standaloneOrderRef.current = standaloneOrder;
  }, [standaloneOrder]);

  const handleMoveExercise = useCallback(
    (id: string, direction: -1 | 1) => {
      const order = standaloneOrderRef.current;
      const index = order.indexOf(id);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= order.length) return;

      const newOrder = [...order];
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      reorderExercises(newOrder);
    },
    [reorderExercises]
  );

  // Selection mode handlers for superset/circuit grouping
  const toggleSelect = useCallback((sessionExerciseId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionExerciseId)) next.delete(sessionExerciseId);
      else next.add(sessionExerciseId);
      return next;
    });
  }, []);

  const handleGroup = useCallback(async (groupType: 'superset' | 'circuit') => {
    if (selectedIds.size < 2) return;
    await groupExercises([...selectedIds], groupType);
    setSelectedIds(new Set());
    setIsSelectMode(false);
  }, [selectedIds, groupExercises]);

  const handleUngroup = useCallback(async (groupId: string) => {
    await ungroupAll(groupId);
  }, [ungroupAll]);

  const cancelSelectMode = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectMode(false);
  }, []);

  // Complete: flush debounced edits, validate against the DB, then confirm
  const handleCompleteClick = useCallback(async () => {
    if (busyRef.current || !activeSession) return;
    busyRef.current = true;
    setIsValidating(true);
    try {
      await flushPendingSaves();

      const seIds = sessionExercises.map((se) => se.id);
      const [freshSets, exercises] = await Promise.all([
        seIds.length > 0 ? db.sets.where('sessionExerciseId').anyOf(seIds).toArray() : Promise.resolve([] as SetType[]),
        db.exercises.bulkGet([...new Set(sessionExercises.map((se) => se.exerciseId))]),
      ]);
      const fieldsMap = new Map<string, ExerciseField[]>();
      for (const ex of exercises) if (ex) fieldsMap.set(ex.id, ex.defaultFields ?? DEFAULT_FIELDS);

      const problem = validateWorkout(sessionExercises, groupSetsBySessionExercise(freshSets), fieldsMap);
      setValidationType(problem);
      if (!problem) setShowCompleteConfirm(true);
    } finally {
      busyRef.current = false;
      setIsValidating(false);
    }
  }, [activeSession, sessionExercises]);

  const handleConfirmComplete = useCallback(async () => {
    await flushPendingSaves();
    await complete();
  }, [complete]);

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
  const actionsDisabled = isLoading || isValidating;

  // Title: template name > routine name > "Workout"
  const title = template?.name ?? routine?.name ?? 'Workout';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{title}</h1>
          <ElapsedTimer startedAt={activeSession.startedAt} />
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            onClick={() => setShowAbandonConfirm(true)}
            disabled={actionsDisabled}
            className={styles.headerBtn}
          >
            Discard
          </Button>
          <Button
            onClick={handleCompleteClick}
            disabled={actionsDisabled}
            aria-busy={isValidating}
            className={styles.headerBtn}
          >
            Complete
          </Button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <span className={styles.meta}>
          Started {formatTime(activeSession.startedAt)}
        </span>
        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={handleOpenNotes}
            disabled={isLoading}
            title="Workout notes"
          >
            <span aria-hidden="true">{activeSession.notes ? '📝' : '📋'}</span>
            Notes
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => setIsPlateCalcOpen(true)}
            title="Plate Calculator"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="2" width="4" height="20" rx="1" />
              <rect x="10" y="6" width="4" height="12" rx="1" />
              <rect x="16" y="4" width="4" height="16" rx="1" />
            </svg>
            Plates
          </button>
        </div>
      </div>

      {validationType && (
        <div className={styles.validationMessage} role="alert">
          <span>{VALIDATION_MESSAGES[validationType]}</span>
          <button className={styles.validationDismiss} onClick={dismissValidation} title="Dismiss" aria-label="Dismiss">×</button>
        </div>
      )}

      <div className={styles.exercises}>
        {groupedExercises.map((group) => {
          if (group.type === 'group' && group.groupType && group.groupId) {
            return (
              <ExerciseGroup
                key={group.groupId}
                groupId={group.groupId}
                groupType={group.groupType}
                exercises={group.exercises}
                templateExerciseMap={templateExerciseMap}
                onRemoveExercise={handleRemoveExercise}
                onSwitchProgression={switchProgressionLevel}
                showValidation={showValidation}
                onUngroup={handleUngroup}
              />
            );
          }

          const exercise = group.exercises[0];
          // For progression slots, look up by progressionId first, then exerciseId
          const templateExercise = exercise.progressionId
            ? templateExerciseMap.get(`prog:${exercise.progressionId}`)
            : templateExerciseMap.get(exercise.exerciseId);

          if (isSelectMode) {
            // Minimal card in select mode — just name + checkbox
            return (
              <div
                key={exercise.id}
                className={`${styles.selectableExercise} ${selectedIds.has(exercise.id) ? styles.selectedExercise : ''}`}
                onClick={() => toggleSelect(exercise.id)}
              >
                <div className={styles.selectCheckbox}>
                  <div className={`${styles.checkbox} ${selectedIds.has(exercise.id) ? styles.checked : ''}`}>
                    {selectedIds.has(exercise.id) && '✓'}
                  </div>
                </div>
                <ExerciseNameLabel exerciseId={exercise.exerciseId} />
              </div>
            );
          }

          const standaloneIndex = exercise.groupId ? -1 : standaloneOrder.indexOf(exercise.id);

          return (
            <SessionExercise
              key={exercise.id}
              sessionExercise={exercise}
              templateExercise={templateExercise}
              onRemove={handleRemoveExercise}
              onSwitchProgression={switchProgressionLevel}
              onMove={standaloneIndex > -1 ? handleMoveExercise : undefined}
              canMoveUp={standaloneIndex > 0}
              canMoveDown={standaloneIndex > -1 && standaloneIndex < standaloneOrder.length - 1}
              showValidation={showValidation}
            />
          );
        })}
      </div>

      {/* Select mode toolbar */}
      {isSelectMode && (
        <div className={styles.selectToolbar}>
          <span className={styles.selectCount}>{selectedIds.size} selected</span>
          <div className={styles.selectActions}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleGroup('superset')}
              disabled={selectedIds.size < 2}
            >
              Superset
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleGroup('circuit')}
              disabled={selectedIds.size < 2}
            >
              Circuit
            </Button>
            <Button variant="ghost" size="sm" onClick={cancelSelectMode}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className={styles.addExercise}>
        <Button
          variant="secondary"
          onClick={() => setIsPickerOpen(true)}
          className={styles.addButton}
        >
          + Add Exercise
        </Button>
        {/* Group button — only show when 2+ ungrouped exercises exist */}
        {!isSelectMode && sessionExercises.filter((e) => !e.groupId).length >= 2 && (
          <Button
            variant="ghost"
            onClick={() => setIsSelectMode(true)}
            className={styles.addButton}
          >
            Link Superset / Circuit
          </Button>
        )}
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
        onConfirm={handleConfirmComplete}
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

      <PlateCalculator
        isOpen={isPlateCalcOpen}
        onClose={() => setIsPlateCalcOpen(false)}
      />
    </div>
  );
}
