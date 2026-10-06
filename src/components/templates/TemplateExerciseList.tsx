import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Input, Select } from '../common';
import { db } from '../../db';
import { useProgressionExercises } from '../../hooks/useProgressions';
import { PROGRESSION_MAP } from '../../data/progressions';
import type { TemplateExercise, TemplateSet, IntensityTechnique, Exercise } from '../../types';
import { VariantChips } from '../exercises/VariantChips';
import { familyTitleFor } from '../../utils/exerciseFamilies';
import styles from './TemplateExerciseList.module.css';

// Set type options - Normal, Warmup, or Failure (which then shows technique dropdown)
type SetType = 'normal' | 'warmup' | 'failure';

const SET_TYPES: { value: SetType; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'warmup', label: 'Warmup' },
  { value: 'failure', label: 'Failure' },
];

// Intensity techniques only shown when set type is "Failure"
const FAILURE_TECHNIQUES: { value: IntensityTechnique; label: string }[] = [
  { value: 'failure', label: 'To Failure' },
  { value: 'myoreps', label: 'Myo Reps' },
  { value: 'dropset', label: 'Drop Set' },
  { value: 'forcedreps', label: 'Forced Reps' },
  { value: 'partials', label: 'Partials (LLP)' },
];

// Helper to get set type from template set
function getSetType(set: TemplateSet): SetType {
  if (set.isWarmup) return 'warmup';
  if (set.intensityTechnique !== 'standard') return 'failure';
  return 'normal';
}

interface TemplateSetRowProps {
  set: TemplateSet;
  setNumber: number;
  onUpdate: (updates: Partial<TemplateSet>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function TemplateSetRow({ set, setNumber, onUpdate, onRemove, canRemove }: TemplateSetRowProps) {
  const setType = getSetType(set);

  const handleSetTypeChange = (newType: SetType) => {
    if (newType === 'warmup') {
      onUpdate({ isWarmup: true, intensityTechnique: 'standard' });
    } else if (newType === 'normal') {
      onUpdate({ isWarmup: false, intensityTechnique: 'standard' });
    } else {
      // failure - default to 'failure' technique
      onUpdate({ isWarmup: false, intensityTechnique: 'failure' });
    }
  };

  return (
    <div className={styles.setRow}>
      <span className={`num ${styles.setNumber}`}>{setNumber}</span>
      <div className={styles.setFields}>
        <Select
          value={setType}
          onChange={(e) => handleSetTypeChange(e.target.value as SetType)}
          options={SET_TYPES}
          className={styles.setTypeSelect}
        />
        {setType === 'failure' && (
          <Select
            value={set.intensityTechnique}
            onChange={(e) => onUpdate({ intensityTechnique: e.target.value as IntensityTechnique })}
            options={FAILURE_TECHNIQUES}
            className={styles.techniqueSelect}
          />
        )}
        {canRemove && (
          <button
            type="button"
            className={styles.removeSetBtn}
            onClick={onRemove}
            title="Remove set"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// Split target reps input: two fields sharing an edge with a dash separator
function TargetRepsInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  // Parse existing value like "8-12" or "8" into min/max
  const parts = value.split('-').map(s => s.trim());
  const minVal = parts[0] ?? '';
  const maxVal = parts.length > 1 ? parts[1] : '';

  const filterInt = (v: string) => v.replace(/[^0-9]/g, '');

  const handleMinChange = (newMin: string) => {
    const filtered = filterInt(newMin);
    if (maxVal) {
      onChange(`${filtered}-${maxVal}`);
    } else {
      onChange(filtered);
    }
  };

  const handleMaxChange = (newMax: string) => {
    const filtered = filterInt(newMax);
    if (filtered) {
      onChange(`${minVal}-${filtered}`);
    } else {
      onChange(minVal);
    }
  };

  return (
    <div className={styles.targetRepsGroup}>
      <input
        type="text"
        inputMode="numeric"
        value={minVal}
        onChange={(e) => handleMinChange(e.target.value)}
        placeholder="min"
        className={styles.targetRepsMin}
      />
      <span className={styles.targetRepsDash}>–</span>
      <input
        type="text"
        inputMode="numeric"
        value={maxVal}
        onChange={(e) => handleMaxChange(e.target.value)}
        placeholder="max"
        className={styles.targetRepsMax}
      />
    </div>
  );
}

interface TemplateExerciseRowProps {
  exercise: TemplateExercise;
  /** undefined = still loading, null = exercise no longer exists */
  exerciseData: Exercise | null | undefined;
  onUpdate: (updates: Partial<TemplateExercise>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

function TemplateExerciseRow({
  exercise,
  exerciseData,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: TemplateExerciseRowProps) {
  const [showNotes, setShowNotes] = useState(!!exercise.notes);
  const isProgression = !!exercise.progressionId;
  const progressionDef = isProgression ? PROGRESSION_MAP[exercise.progressionId!] : null;
  const progressionExercises = useProgressionExercises(isProgression ? exercise.progressionId : undefined);

  const handleSetUpdate = (setIndex: number, updates: Partial<TemplateSet>) => {
    const newSets = [...exercise.sets];
    newSets[setIndex] = { ...newSets[setIndex], ...updates };
    onUpdate({ sets: newSets });
  };

  const handleAddSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: TemplateSet = {
      order: exercise.sets.length,
      isWarmup: false,
      intensityTechnique: lastSet?.intensityTechnique ?? 'standard',
    };
    onUpdate({ sets: [...exercise.sets, newSet] });
  };

  const handleRemoveSet = (setIndex: number) => {
    const newSets = exercise.sets
      .filter((_, i) => i !== setIndex)
      .map((s, i) => ({ ...s, order: i }));
    onUpdate({ sets: newSets });
  };

  return (
    <div className={styles.exerciseRow}>
      <div className={styles.exerciseHeader}>
        {(onMoveUp || onMoveDown) && (
          <div className={styles.moveButtons}>
            <button
              type="button"
              className={styles.moveBtn}
              onClick={onMoveUp}
              disabled={!canMoveUp}
              title="Move up"
            >
              ▲
            </button>
            <button
              type="button"
              className={styles.moveBtn}
              onClick={onMoveDown}
              disabled={!canMoveDown}
              title="Move down"
            >
              ▼
            </button>
          </div>
        )}
        <div className={styles.exerciseNameGroup}>
          {isProgression && progressionDef && (
            <span className={`chip chip-accent ${styles.progressionBadge}`}>
              {progressionDef.name}
            </span>
          )}
          {isProgression ? (
            <Select
              value={exercise.exerciseId}
              onChange={(e) => onUpdate({ exerciseId: e.target.value })}
              options={(progressionExercises ?? []).map((pe) => {
                const level = pe.progressionMemberships?.find(
                  (pm) => pm.progressionId === exercise.progressionId
                )?.level;
                return {
                  value: pe.id,
                  label: level !== undefined ? `Lvl ${level} — ${pe.name}` : pe.name,
                };
              })}
              className={styles.progressionLevelSelect}
            />
          ) : (
            <>
              <span className={`${styles.exerciseName} ${exerciseData === null ? styles.exerciseMissing : ''}`}>
                {exerciseData === undefined ? '…' : exerciseData ? familyTitleFor(exerciseData) : 'Exercise missing'}
              </span>
              {exerciseData && (
                <VariantChips
                  exercise={exerciseData}
                  onChange={(next) => onUpdate({ exerciseId: next.id })}
                />
              )}
            </>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} title="Remove exercise" aria-label="Remove exercise" className={styles.removeExerciseBtn}>
          ×
        </Button>
      </div>

      {/* Exercise-level settings: Target Reps */}
      <div className={styles.exerciseSettings}>
        <div className={styles.settingField}>
          <label className={styles.settingLabel}>Target Reps</label>
          <TargetRepsInput
            value={exercise.targetReps}
            onChange={(val) => onUpdate({ targetReps: val })}
          />
        </div>
      </div>

      {/* Sets list */}
      <div className={styles.setsSection}>
        <div className={styles.setsHeader}>
          <span className={styles.setsLabel}>Sets ({exercise.sets.length})</span>
        </div>
        {exercise.sets.map((set, index) => (
          <TemplateSetRow
            key={index}
            set={set}
            setNumber={index + 1}
            onUpdate={(updates) => handleSetUpdate(index, updates)}
            onRemove={() => handleRemoveSet(index)}
            canRemove={exercise.sets.length > 1}
          />
        ))}
        <button
          type="button"
          className={styles.addSetBtn}
          onClick={handleAddSet}
        >
          + Add Set
        </button>
      </div>

      {/* Notes toggle */}
      <div className={styles.notesToggle}>
        <button
          type="button"
          className={styles.notesBtn}
          onClick={() => setShowNotes(!showNotes)}
        >
          {showNotes ? 'Hide notes' : 'Add notes'}
        </button>
      </div>

      {showNotes && (
        <div className={styles.notesField}>
          <Input
            placeholder="Notes for this exercise..."
            value={exercise.notes ?? ''}
            onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
          />
        </div>
      )}

      {exercise.groupId && (
        <div className={`chip chip-accent ${styles.groupBadge}`}>
          🔗 Superset
        </div>
      )}
    </div>
  );
}

/** Template exercise with an optional client-only stable key (assigned by TemplateForm) */
export type KeyedTemplateExercise = TemplateExercise & { uid?: string };

/** Stable React key for a row — uid when present, else a content-derived fallback */
function rowKey(ex: KeyedTemplateExercise): string {
  return ex.uid ?? `${ex.exerciseId}-${ex.progressionId ?? ''}-${ex.order}`;
}

interface TemplateExerciseListProps {
  exercises: KeyedTemplateExercise[];
  onUpdate: (exerciseId: string, updates: Partial<TemplateExercise>, order?: number) => void;
  onRemove: (exerciseId: string, order?: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddClick: () => void;
  onAddProgressionClick?: () => void;
}

export function TemplateExerciseList({
  exercises,
  onUpdate,
  onRemove,
  onReorder,
  onAddClick,
  onAddProgressionClick,
}: TemplateExerciseListProps) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const sortedExercises = [...exercises].sort((a, b) => a.order - b.order);

  // Batch-fetch exercise data for all rows in one query
  const exerciseIdsKey = [...new Set(exercises.map((e) => e.exerciseId))].sort().join(',');
  const exerciseMap = useLiveQuery(async () => {
    const ids = exerciseIdsKey ? exerciseIdsKey.split(',') : [];
    const found = await db.exercises.bulkGet(ids);
    const map = new Map<string, Exercise>();
    for (const ex of found) if (ex) map.set(ex.id, ex);
    return map;
  }, [exerciseIdsKey]);
  const dataFor = (ex: TemplateExercise): Exercise | null | undefined =>
    exerciseMap ? exerciseMap.get(ex.exerciseId) ?? null : undefined;

  const toggleSelectIndex = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const handleGroupTemplate = () => {
    if (selectedIndices.size < 2) return;
    const groupId = crypto.randomUUID();
    const indices = [...selectedIndices].sort((a, b) => a - b);
    for (let i = 0; i < indices.length; i++) {
      const ex = sortedExercises[indices[i]];
      onUpdate(ex.exerciseId, { groupId, groupType: 'superset', groupOrder: i }, ex.order);
    }
    setSelectedIndices(new Set());
    setIsSelectMode(false);
  };

  const handleUngroupTemplate = (groupId: string) => {
    for (const ex of sortedExercises) {
      if (ex.groupId === groupId) {
        onUpdate(ex.exerciseId, { groupId: undefined, groupType: undefined, groupOrder: undefined }, ex.order);
      }
    }
  };

  const cancelSelect = () => {
    setSelectedIndices(new Set());
    setIsSelectMode(false);
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedExercises.length) return;
    onReorder(index, targetIndex);
  };

  // Identify groups for rendering group wrappers
  const processedGroupIds = new Set<string>();

  return (
    <div className={styles.list}>
      {/* Select mode toolbar */}
      {isSelectMode && (
        <div className={styles.selectToolbar}>
          <span className={styles.selectCount}>{selectedIndices.size} selected</span>
          <div className={styles.selectActions}>
            <Button variant="secondary" size="sm" onClick={handleGroupTemplate} disabled={selectedIndices.size < 2}>
              Superset
            </Button>
            <Button variant="ghost" size="sm" onClick={cancelSelect}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {sortedExercises.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No exercises added yet</p>
          <div className={styles.addButtons}>
            <Button variant="secondary" onClick={onAddClick} className={styles.addExerciseButton}>
              + Add Exercise
            </Button>
            {onAddProgressionClick && (
              <Button variant="secondary" onClick={onAddProgressionClick} className={styles.addExerciseButton}>
                + Add Progression
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {sortedExercises.map((exercise, index) => {
            // Group wrapper rendering
            if (exercise.groupId && !processedGroupIds.has(exercise.groupId)) {
              processedGroupIds.add(exercise.groupId);
              const groupMembers = sortedExercises.filter((e) => e.groupId === exercise.groupId);
              return (
                <div key={`group-${exercise.groupId}`} className={styles.groupWrapper}>
                  <div className={styles.groupHeader}>
                    <span className={`chip chip-accent ${styles.groupLabel}`}>
                      Superset
                    </span>
                    <button
                      className={styles.ungroupBtn}
                      onClick={() => handleUngroupTemplate(exercise.groupId!)}
                    >
                      Unlink
                    </button>
                  </div>
                  {groupMembers.map((gm) => {
                    const gIndex = sortedExercises.indexOf(gm);
                    return (
                      <TemplateExerciseRow
                        key={rowKey(gm)}
                        exercise={gm}
                        exerciseData={dataFor(gm)}
                        onUpdate={(updates) => onUpdate(gm.exerciseId, updates, gm.order)}
                        onRemove={() => onRemove(gm.exerciseId, gm.order)}
                        onMoveUp={() => moveExercise(gIndex, -1)}
                        onMoveDown={() => moveExercise(gIndex, 1)}
                        canMoveUp={gIndex > 0}
                        canMoveDown={gIndex < sortedExercises.length - 1}
                      />
                    );
                  })}
                </div>
              );
            }

            // Skip exercises already rendered inside a group
            if (exercise.groupId) return null;

            if (isSelectMode) {
              return (
                <div
                  key={rowKey(exercise)}
                  className={`${styles.selectableRow} ${selectedIndices.has(index) ? styles.selectedRow : ''}`}
                  onClick={() => toggleSelectIndex(index)}
                >
                  <div className={`${styles.selectCheck} ${selectedIndices.has(index) ? styles.selectCheckActive : ''}`}>
                    {selectedIndices.has(index) && '✓'}
                  </div>
                  <TemplateExerciseRow
                    exercise={exercise}
                    exerciseData={dataFor(exercise)}
                    onUpdate={(updates) => onUpdate(exercise.exerciseId, updates, exercise.order)}
                    onRemove={() => onRemove(exercise.exerciseId, exercise.order)}
                  />
                </div>
              );
            }

            return (
              <TemplateExerciseRow
                key={rowKey(exercise)}
                exercise={exercise}
                exerciseData={dataFor(exercise)}
                onUpdate={(updates) => onUpdate(exercise.exerciseId, updates, exercise.order)}
                onRemove={() => onRemove(exercise.exerciseId, exercise.order)}
                onMoveUp={() => moveExercise(index, -1)}
                onMoveDown={() => moveExercise(index, 1)}
                canMoveUp={index > 0}
                canMoveDown={index < sortedExercises.length - 1}
              />
            );
          })}

          <div className={styles.addButtons}>
            <Button variant="secondary" onClick={onAddClick} className={styles.addExerciseButton}>
              + Add Exercise
            </Button>
            {onAddProgressionClick && (
              <Button variant="secondary" onClick={onAddProgressionClick} className={styles.addExerciseButton}>
                + Add Progression
              </Button>
            )}
            {!isSelectMode && sortedExercises.filter((e) => !e.groupId).length >= 2 && (
              <Button variant="ghost" onClick={() => setIsSelectMode(true)} className={styles.addExerciseButton}>
                Link Superset
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
