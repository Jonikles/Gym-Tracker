import { useState } from 'react';
import { Button, Input, Select } from '../common';
import { useExercise } from '../../hooks/useExercises';
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

interface TemplateExerciseRowProps {
  exercise: TemplateExercise;
  onUpdate: (updates: Partial<TemplateExercise>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function TemplateExerciseRow({
  exercise,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: TemplateExerciseRowProps) {
  const exerciseData = useExercise(exercise.exerciseId);
  const [showNotes, setShowNotes] = useState(!!exercise.notes);

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
        <div className={styles.orderButtons}>
          <button
            type="button"
            className={styles.orderBtn}
            onClick={onMoveUp}
            disabled={!onMoveUp}
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className={styles.orderBtn}
            onClick={onMoveDown}
            disabled={!onMoveDown}
            title="Move down"
          >
            ↓
          </button>
        </div>
        <span className={styles.exerciseName}>
          {exerciseData?.name ?? 'Loading...'}
        </span>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>

      {/* Exercise-level settings: Target Reps + Weight */}
      <div className={styles.exerciseSettings}>
        <div className={styles.settingField}>
          <label className={styles.settingLabel}>Target Reps</label>
          <Input
            placeholder="8-12"
            value={exercise.targetReps}
            onChange={(e) => onUpdate({ targetReps: e.target.value })}
            className={styles.repsInput}
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
  onUpdate: (exerciseId: string, updates: Partial<TemplateExercise>) => void;
  onRemove: (exerciseId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddClick: () => void;
}

export function TemplateExerciseList({
  exercises,
  onUpdate,
  onRemove,
  onReorder,
  onAddClick,
}: TemplateExerciseListProps) {
  const sortedExercises = [...exercises].sort((a, b) => a.order - b.order);

  return (
    <div className={styles.list}>
      {sortedExercises.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No exercises added yet</p>
          <button
            type="button"
            className={styles.addExerciseBtn}
            onClick={onAddClick}
          >
            +
          </button>
        </div>
      ) : (
        <>
          {sortedExercises.map((exercise, index) => (
            <TemplateExerciseRow
              key={exercise.exerciseId}
              exercise={exercise}
              onUpdate={(updates) => onUpdate(exercise.exerciseId, updates)}
              onRemove={() => onRemove(exercise.exerciseId)}
              onMoveUp={index > 0 ? () => onReorder(index, index - 1) : undefined}
              onMoveDown={
                index < sortedExercises.length - 1
                  ? () => onReorder(index, index + 1)
                  : undefined
              }
            />
          ))}
          <button
            type="button"
            className={styles.addExerciseBtnBottom}
            onClick={onAddClick}
          >
            +
          </button>
        </>
      )}
    </div>
  );
}
