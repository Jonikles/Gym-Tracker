import { useState } from 'react';
import { Button, Input, Select } from '../common';
import { useExercise } from '../../hooks/useExercises';
import { PROGRESSION_MAP } from '../../data/progressions';
import type { TemplateExercise, TemplateSet, IntensityTechnique } from '../../types';
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
  { value: 'cluster', label: 'Cluster Set' },
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
      <span className={styles.setNumber}>{setNumber}</span>
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
  onUpdate: (updates: Partial<TemplateExercise>) => void;
  onRemove: () => void;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}

function TemplateExerciseRow({
  exercise,
  onUpdate,
  onRemove,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
}: TemplateExerciseRowProps) {
  const exerciseData = useExercise(exercise.exerciseId);
  const [showNotes, setShowNotes] = useState(!!exercise.notes);
  const isProgression = !!exercise.progressionId;
  const progressionDef = isProgression ? PROGRESSION_MAP[exercise.progressionId!] : null;

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
    <div
      className={`${styles.exerciseRow} ${isDragging ? styles.dragging : ''}`}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={styles.exerciseHeader}>
        {onDragStart && <span className={styles.dragHandle}>⋮⋮</span>}
        <div className={styles.exerciseNameGroup}>
          {isProgression && progressionDef && (
            <span className={styles.progressionBadge}>
              {progressionDef.name}
            </span>
          )}
          <span className={styles.exerciseName}>
            {isProgression
              ? `Default: ${exerciseData?.name ?? 'Loading...'}`
              : exerciseData?.name ?? 'Loading...'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} title="Remove exercise">
          ×
        </Button>
      </div>

      {/* Exercise-level settings: Target Reps + Weight */}
      <div className={styles.exerciseSettings}>
        <div className={styles.settingField}>
          <label className={styles.settingLabel}>Target Reps</label>
          <TargetRepsInput
            value={exercise.targetReps}
            onChange={(val) => onUpdate({ targetReps: val })}
          />
        </div>
        <div className={styles.settingField}>
          <label className={styles.settingLabel}>Target Weight (optional)</label>
          <Input
            type="number"
            placeholder="kg"
            value={exercise.weight !== undefined ? String(exercise.weight) : ''}
            onChange={(e) =>
              onUpdate({
                weight: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            className={styles.weightInput}
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
        <div className={styles.groupBadge}>
          {exercise.groupType === 'superset' ? '🔗 Superset' : '🔄 Circuit'}
        </div>
      )}
    </div>
  );
}

interface TemplateExerciseListProps {
  exercises: TemplateExercise[];
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const sortedExercises = [...exercises].sort((a, b) => a.order - b.order);

  const toggleSelectIndex = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const handleGroupTemplate = (groupType: 'superset' | 'circuit') => {
    if (selectedIndices.size < 2) return;
    const groupId = crypto.randomUUID();
    const indices = [...selectedIndices].sort((a, b) => a - b);
    for (let i = 0; i < indices.length; i++) {
      const ex = sortedExercises[indices[i]];
      onUpdate(ex.exerciseId, { groupId, groupType, groupOrder: i }, ex.progressionId ? ex.order : undefined);
    }
    setSelectedIndices(new Set());
    setIsSelectMode(false);
  };

  const handleUngroupTemplate = (groupId: string) => {
    for (const ex of sortedExercises) {
      if (ex.groupId === groupId) {
        onUpdate(ex.exerciseId, { groupId: undefined, groupType: undefined, groupOrder: undefined }, ex.progressionId ? ex.order : undefined);
      }
    }
  };

  const cancelSelect = () => {
    setSelectedIndices(new Set());
    setIsSelectMode(false);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    // Reorder live as user drags
    if (dragIndex !== null && dragIndex !== index) {
      onReorder(dragIndex, index);
      setDragIndex(index);
    }
  };

  const handleDrop = () => {
    setDragIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  // Identify groups for rendering group wrappers
  const processedGroupIds = new Set<string>();

  return (
    <div className={styles.list} onDragEnd={handleDragEnd}>
      {/* Select mode toolbar */}
      {isSelectMode && (
        <div className={styles.selectToolbar}>
          <span className={styles.selectCount}>{selectedIndices.size} selected</span>
          <div className={styles.selectActions}>
            <Button variant="secondary" size="sm" onClick={() => handleGroupTemplate('superset')} disabled={selectedIndices.size < 2}>
              Superset
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleGroupTemplate('circuit')} disabled={selectedIndices.size < 2}>
              Circuit
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
                    <span className={styles.groupLabel}>
                      {exercise.groupType === 'superset' ? 'Superset' : 'Circuit'}
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
                        key={`${gm.order}`}
                        exercise={gm}
                        onUpdate={(updates) => onUpdate(gm.exerciseId, updates, gm.progressionId ? gm.order : undefined)}
                        onRemove={() => onRemove(gm.exerciseId, gm.progressionId ? gm.order : undefined)}
                        isDragging={dragIndex === gIndex}
                        onDragStart={() => handleDragStart(gIndex)}
                        onDragOver={(e) => handleDragOver(e, gIndex)}
                        onDrop={handleDrop}
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
                  key={`${exercise.order}`}
                  className={`${styles.selectableRow} ${selectedIndices.has(index) ? styles.selectedRow : ''}`}
                  onClick={() => toggleSelectIndex(index)}
                >
                  <div className={`${styles.selectCheck} ${selectedIndices.has(index) ? styles.selectCheckActive : ''}`}>
                    {selectedIndices.has(index) && '✓'}
                  </div>
                  <TemplateExerciseRow
                    exercise={exercise}
                    onUpdate={(updates) => onUpdate(exercise.exerciseId, updates, exercise.progressionId ? exercise.order : undefined)}
                    onRemove={() => onRemove(exercise.exerciseId, exercise.progressionId ? exercise.order : undefined)}
                  />
                </div>
              );
            }

            return (
              <TemplateExerciseRow
                key={`${exercise.order}`}
                exercise={exercise}
                onUpdate={(updates) => onUpdate(exercise.exerciseId, updates, exercise.progressionId ? exercise.order : undefined)}
                onRemove={() => onRemove(exercise.exerciseId, exercise.progressionId ? exercise.order : undefined)}
                isDragging={dragIndex === index}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
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
                Link Superset / Circuit
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
