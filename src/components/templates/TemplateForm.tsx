import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, ConfirmDialog } from '../common';
import { ExercisePicker } from '../exercises';
import { TemplateExerciseList } from './TemplateExerciseList';
import { createTemplate, updateTemplate } from '../../hooks/useTemplates';
import type { Template, TemplateExercise, TemplateSet, Exercise } from '../../types';
import styles from './TemplateForm.module.css';

interface TemplateFormProps {
  template?: Template;
  onSave?: () => void;
}

export function TemplateForm({ template, onSave }: TemplateFormProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(template?.name ?? '');
  const [exercises, setExercises] = useState<TemplateExercise[]>(
    template?.exercises ?? []
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // v1.4.1: Track if form has unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isEditing = !!template;

  // Update state if template changes (e.g., navigating between templates)
  useEffect(() => {
    if (template) {
      setName(template.name);
      setExercises(template.exercises);
      setHasChanges(false);
    }
  }, [template?.id]);

  // v1.4.1: Mark as changed when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setHasChanges(true);
  };

  const handleAddExercise = (exercise: Exercise) => {
    // Create default sets for the new exercise
    const defaultSets: TemplateSet[] = [
      { order: 0, isWarmup: false, intensityTechnique: 'standard' },
      { order: 1, isWarmup: false, intensityTechnique: 'standard' },
      { order: 2, isWarmup: false, intensityTechnique: 'standard' },
    ];

    const newExercise: TemplateExercise = {
      exerciseId: exercise.id,
      order: exercises.length,
      sets: defaultSets,
      targetReps: '8-12', // Single target reps for all sets
    };
    setExercises([...exercises, newExercise]);
    setIsPickerOpen(false);
    setHasChanges(true);
  };

  const handleUpdateExercise = (
    exerciseId: string,
    updates: Partial<TemplateExercise>
  ) => {
    setExercises(
      exercises.map((e) =>
        e.exerciseId === exerciseId ? { ...e, ...updates } : e
      )
    );
    setHasChanges(true);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExercises(
      exercises
        .filter((e) => e.exerciseId !== exerciseId)
        .map((e, index) => ({ ...e, order: index }))
    );
    setHasChanges(true);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const sorted = [...exercises].sort((a, b) => a.order - b.order);
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, moved);
    setExercises(sorted.map((e, index) => ({ ...e, order: index })));
    setHasChanges(true);
  };

  // v1.4.1: Handle cancel with confirmation
  const handleCancel = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      navigate('/templates');
    }
  };

  const handleDiscard = () => {
    setShowDiscardConfirm(false);
    navigate('/templates');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    if (exercises.length === 0) {
      setError('Add at least one exercise');
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing) {
        await updateTemplate(template.id, { name: name.trim(), exercises });
        setHasChanges(false);
      } else {
        const id = await createTemplate({ name: name.trim(), exercises });
        setHasChanges(false);
        navigate(`/templates/${id}`);
        return;
      }

      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const existingExerciseIds = exercises.map((e) => e.exerciseId);

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <Input
          label="Template Name"
          placeholder="e.g., Push Day, Upper Body A"
          value={name}
          onChange={handleNameChange}
          autoFocus={!isEditing}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Exercises</h2>
        </div>

        <TemplateExerciseList
          exercises={exercises}
          onUpdate={handleUpdateExercise}
          onRemove={handleRemoveExercise}
          onReorder={handleReorder}
          onAddClick={() => setIsPickerOpen(true)}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Template'}
        </Button>
      </div>

      <ExercisePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAddExercise}
        excludeIds={existingExerciseIds}
        title="Add Exercise"
      />

      {/* v1.4.1: Discard Confirmation */}
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleDiscard}
        title="Discard Changes"
        message="You have unsaved changes. Discard them?"
        confirmLabel="Discard"
        variant="danger"
      />
    </form>
  );
}
