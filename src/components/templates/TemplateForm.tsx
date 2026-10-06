import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common';
import { useUnsavedChangesBlocker } from '../common/useUnsavedChangesBlocker';
import { ExercisePicker } from '../exercises';
import { ProgressionPicker } from '../progressions/ProgressionPicker';
import { TemplateExerciseList, type KeyedTemplateExercise } from './TemplateExerciseList';
import { createTemplate, updateTemplate } from '../../hooks/useTemplates';
import { getLowestLevelExercise } from '../../hooks/useProgressions';
import type { Template, TemplateExercise, TemplateSet, Exercise } from '../../types';
import styles from './TemplateForm.module.css';

interface TemplateFormProps {
  template?: Template;
  onSave?: () => void;
}

/** Form-local exercise with a stable React key (never persisted) */
type FormExercise = KeyedTemplateExercise & { uid: string };

function withKeys(exercises: TemplateExercise[]): FormExercise[] {
  // Normalize order to 0..n-1: rows are addressed by their (unique) order
  return [...exercises]
    .sort((a, b) => a.order - b.order)
    .map((e, index) => ({ ...e, order: index, uid: crypto.randomUUID() }));
}

function stripKeys(exercises: FormExercise[]): TemplateExercise[] {
  return exercises.map((e) => {
    const copy: KeyedTemplateExercise = { ...e };
    delete copy.uid;
    return copy;
  });
}

function defaultSets(): TemplateSet[] {
  return [
    { order: 0, isWarmup: false, intensityTechnique: 'standard' },
    { order: 1, isWarmup: false, intensityTechnique: 'standard' },
    { order: 2, isWarmup: false, intensityTechnique: 'standard' },
  ];
}

export function TemplateForm({ template, onSave }: TemplateFormProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(template?.name ?? '');
  const [exercises, setExercises] = useState<FormExercise[]>(() =>
    withKeys(template?.exercises ?? [])
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
      setExercises(withKeys(template.exercises));
      setIsDirty(false);
    }
  }, [template?.id]);

  // Block navigation when dirty
  const { allowNextNavigation, dialog: unsavedChangesDialog } = useUnsavedChangesBlocker(
    isDirty && !isSaving,
    { onDiscard: () => setIsDirty(false) }
  );

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
      const toSave = stripKeys(exercises);
      if (isEditing && template) {
        await updateTemplate(template.id, {
          name: trimmedName,
          exercises: toSave,
        });
        setIsDirty(false);
        setIsSaving(false);
        if (onSave) {
          // Saved — let onSave's navigation through even though isDirty is still true this render
          allowNextNavigation();
          onSave();
        }
      } else {
        const id = await createTemplate({
          name: trimmedName,
          exercises: toSave,
        });
        setIsDirty(false);
        setIsSaving(false);
        allowNextNavigation();
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
    setExercises((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        exerciseId: exercise.id,
        order: prev.length,
        sets: defaultSets(),
        targetReps: '8-12',
      },
    ]);
    markDirty();
    setIsPickerOpen(false);
  };

  const handleAddProgression = async (progressionId: string) => {
    const lowestExercise = await getLowestLevelExercise(progressionId);
    if (!lowestExercise) return;

    // Functional update: `exercises` may be stale after the await
    setExercises((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        exerciseId: lowestExercise.id,
        progressionId,
        order: prev.length,
        sets: defaultSets(),
        targetReps: '8-12',
      },
    ]);
    markDirty();
    setIsProgressionPickerOpen(false);
  };

  const handleUpdateExercise = (
    exerciseId: string,
    updates: Partial<TemplateExercise>,
    order?: number
  ) => {
    // Functional update: grouping calls this several times in one handler
    setExercises((prev) =>
      prev.map((e) => {
        if (order !== undefined) {
          return e.order === order ? { ...e, ...updates } : e;
        }
        return e.exerciseId === exerciseId ? { ...e, ...updates } : e;
      })
    );
    markDirty();
  };

  const handleRemoveExercise = (exerciseId: string, order?: number) => {
    setExercises((prev) =>
      prev
        .filter((e) => {
          if (order !== undefined) return e.order !== order;
          return e.exerciseId !== exerciseId;
        })
        .map((e, index) => ({ ...e, order: index }))
    );
    markDirty();
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setExercises((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      return sorted.map((e, index) => ({ ...e, order: index }));
    });
    markDirty();
  };

  const handleBack = () => {
    if (isEditing && template) {
      navigate(`/templates/${template.id}`);
    } else {
      navigate('/templates');
    }
  };

  const existingExerciseIds = exercises.map((e) => e.exerciseId);

  return (
    <div className={styles.form}>
      <header className={styles.header}>
        <Button variant="ghost" size="sm" className={styles.backBtn} onClick={handleBack}>
          ← Back
        </Button>
        <input
          className={styles.nameInput}
          placeholder="e.g., Push Day, Upper Body A"
          value={name}
          onChange={handleNameChange}
          autoFocus={!isEditing}
        />
        <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </header>

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
      {unsavedChangesDialog}
    </div>
  );
}
