import { useState, type FormEvent } from 'react';
import { Button, Input, Select } from '../common';
import type { Exercise, ExerciseField, MuscleGroup } from '../../types';
import { MUSCLE_GROUP_CATEGORIES } from '../../types/exercise';
import { useExercises } from '../../hooks/useExercises';
import styles from './ExerciseForm.module.css';

interface ExerciseFormProps {
  exercise?: Exercise;
  onSubmit: (data: ExerciseFormData) => void;
  onCancel: () => void;
}

export interface ExerciseFormData {
  name: string;
  muscleGroups: MuscleGroup[];
  movementPattern: string;
  equipment: string;
  defaultFields: ExerciseField[];
  parentId?: string;
}

const AVAILABLE_FIELDS: { value: ExerciseField; label: string }[] = [
  { value: 'weight', label: 'Weight' },
  { value: 'reps', label: 'Reps' },
  { value: 'time', label: 'Time' },
  { value: 'distance', label: 'Distance' },
];

const MOVEMENT_PATTERNS = [
    'horizontal-push',
    'vertical-push',
    'dip',
    'horizontal-pull',
    'vertical-pull',
    'hinge',
    'squat',
    'core',
    'carry',
];

const EQUIPMENT_TYPES = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'rings', 'kettlebell', 'bands'];

export function ExerciseForm({ exercise, onSubmit, onCancel }: ExerciseFormProps) {
  const [name, setName] = useState(exercise?.name ?? '');
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(
    exercise?.muscleGroups ?? []
  );
  const [movementPattern, setMovementPattern] = useState(
    exercise?.movementPattern ?? ''
  );
  const [equipment, setEquipment] = useState(exercise?.equipment ?? '');
  const [defaultFields, setDefaultFields] = useState<ExerciseField[]>(
    exercise?.defaultFields ?? ['weight', 'reps']
  );
  const [parentId, setParentId] = useState(exercise?.parentId ?? '');

  // Get existing exercises for parent linking
  const allExercises = useExercises();

  // Filter out current exercise from parent options
  const parentOptions = allExercises
    .filter((e) => e.id !== exercise?.id)
    .map((e) => ({ value: e.id, label: e.name }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      muscleGroups,
      movementPattern,
      equipment,
      defaultFields,
      parentId: parentId || undefined,
    });
  };

  const toggleMuscleGroup = (mg: MuscleGroup) => {
    setMuscleGroups((prev) =>
      prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg]
    );
  };

  const toggleDefaultField = (field: ExerciseField) => {
    setDefaultFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  // Format muscle group for display (replace hyphens with spaces, capitalize)
  const formatMuscleGroup = (mg: MuscleGroup): string => {
    return mg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input
        label="Exercise Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Incline Dumbbell Press"
        required
        autoFocus
      />

      <div className={styles.field}>
        <label className={styles.label}>Muscle Groups</label>
        <div className={styles.muscleCategories}>
          {Object.entries(MUSCLE_GROUP_CATEGORIES).map(([category, muscles]) => (
            <div key={category} className={styles.muscleCategory}>
              <div className={styles.categoryLabel}>{category}</div>
              <div className={styles.tagGrid}>
                {muscles.map((mg) => (
                  <button
                    key={mg}
                    type="button"
                    className={`${styles.tagButton} ${muscleGroups.includes(mg) ? styles.selected : ''}`}
                    onClick={() => toggleMuscleGroup(mg)}
                  >
                    {formatMuscleGroup(mg)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Select
        label="Movement Pattern"
        value={movementPattern}
        onChange={(e) => setMovementPattern(e.target.value)}
        options={MOVEMENT_PATTERNS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
        placeholder="Select movement..."
      />

      <Select
        label="Equipment"
        value={equipment}
        onChange={(e) => setEquipment(e.target.value)}
        options={EQUIPMENT_TYPES.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }))}
        placeholder="Select equipment..."
      />

      <div className={styles.field}>
        <label className={styles.label}>Default Fields (shown when logging)</label>
        <div className={styles.tagGrid}>
          {AVAILABLE_FIELDS.map((field) => (
            <button
              key={field.value}
              type="button"
              className={`${styles.tagButton} ${defaultFields.includes(field.value) ? styles.selected : ''}`}
              onClick={() => toggleDefaultField(field.value)}
            >
              {field.label}
            </button>
          ))}
        </div>
      </div>

      <Select
        label="Parent Exercise (optional, for variation grouping)"
        value={parentId}
        onChange={(e) => setParentId(e.target.value)}
        options={parentOptions}
        placeholder="None (standalone exercise)"
      />

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          {exercise ? 'Save Changes' : 'Create Exercise'}
        </Button>
      </div>
    </form>
  );
}
