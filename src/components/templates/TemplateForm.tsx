import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { Input, Button, ConfirmDialog } from '../common';
import { ExercisePicker } from '../exercises';
import { ProgressionPicker } from '../progressions/ProgressionPicker';
import { TemplateExerciseList } from './TemplateExerciseList';
import { createTemplate, updateTemplate } from '../../hooks/useTemplates';
import { getLowestLevelExercise } from '../../hooks/useProgressions';
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
  const [isProgressionPickerOpen, setIsProgressionPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!template;

  // Update state if template changes (e.g., navigating between templates)
  useEffect(() => {
    if (template) {
      setName(template.name);
      setExercises(template.exercises);
      setIsDirty(false);
    }
  }, [template?.id]);

  // Block navigation when dirty
  const blocker = useBlocker(isDirty && !isSaving);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Template name is required');
      return;
    }
    if (exercises.length === 0) {
      setError('Add at least one exercise');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && template) {
        await updateTemplate(template.id, {
          name: trimmedName,
          exercises,
        });
        setIsDirty(false);
        setIsSaving(false);
        if (onSave) onSave();
      } else {
        const id = await createTemplate({
          name: trimmedName,
          exercises,
        });
        setIsDirty(false);
        setIsSaving(false);
        navigate(`/templates/${id}`, { replace: true });
      }
      setError(null);
    } catch (err) {
      setIsSaving(false);
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    markDirty();
    if (error) setError(null);
  };

  const handleAddExercise = (exercise: Exercise) => {
    const defaultSets: TemplateSet[] = [
      { order: 0, isWarmup: false, intensityTechnique: 'standard' },
      { order: 1, isWarmup: false, intensityTechnique: 'standard' },
      { order: 2, isWarmup: false, intensityTechnique: 'standard' },
    ];

    const newExercise: TemplateExercise = {
      exerciseId: exercise.id,
      order: exercises.length,
      sets: defaultSets,
      targetReps: '8-12',
    };
    setExercises([...exercises, newExercise]);
    markDirty();
    setIsPickerOpen(false);
  };

  const handleAddProgression = async (progressionId: string) => {
    const defaultSets: TemplateSet[] = [
      { order: 0, isWarmup: false, intensityTechnique: 'standard' },
      { order: 1, isWarmup: false, intensityTechnique: 'standard' },
      { order: 2, isWarmup: false, intensityTechnique: 'standard' },
    ];

    const lowestExercise = await getLowestLevelExercise(progressionId);
    if (!lowestExercise) return;

    const newExercise: TemplateExercise = {
      exerciseId: lowestExercise.id,
      progressionId,
      order: exercises.length,
      sets: defaultSets,
      targetReps: '8-12',
    };
    setExercises([...exercises, newExercise]);
    markDirty();
    setIsProgressionPickerOpen(false);
  };

  const handleUpdateExercise = (
    exerciseId: string,
    updates: Partial<TemplateExercise>,
    order?: number
  ) => {
    setExercises(
      exercises.map((e) => {
        if (order !== undefined) {
          return e.order === order ? { ...e, ...updates } : e;
        }
        return e.exerciseId === exerciseId ? { ...e, ...updates } : e;
      })
    );
    markDirty();
  };

  const handleRemoveExercise = (exerciseId: string, order?: number) => {
    setExercises(
      exercises
        .filter((e) => {
          if (order !== undefined) return e.order !== order;
          return e.exerciseId !== exerciseId;
        })
        .map((e, index) => ({ ...e, order: index }))
    );
    markDirty();
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const sorted = [...exercises].sort((a, b) => a.order - b.order);
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, moved);
    setExercises(sorted.map((e, index) => ({ ...e, order: index })));
    markDirty();
  };

  const handleBack = () => {
    if (isEditing && template) {
      navigate(`/templates/${template.id}`);
    } else {
      navigate('/templates');
    }
  };

  const handleDiscardAndLeave = async () => {
    // If this was a new unsaved template, nothing to clean up
    setIsDirty(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  const existingExerciseIds = exercises.map((e) => e.exerciseId);

  return (
    <div className={styles.form}>
      <header className={styles.header}>
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <h1 className={styles.headerTitle}>{isEditing ? 'Edit Template' : 'New Template'}</h1>
        <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </header>

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
          onAddProgressionClick={() => setIsProgressionPickerOpen(true)}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <ExercisePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAddExercise}
        excludeIds={existingExerciseIds}
        title="Add Exercise"
      />

      <ProgressionPicker
        isOpen={isProgressionPickerOpen}
        onClose={() => setIsProgressionPickerOpen(false)}
        onSelect={handleAddProgression}
      />

      {/* Navigation blocker dialog */}
      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        onConfirm={handleDiscardAndLeave}
        title="Unsaved Changes"
        message="You have unsaved changes. Leave without saving?"
        confirmLabel="Discard & Leave"
        variant="danger"
      />
    </div>
  );
}
