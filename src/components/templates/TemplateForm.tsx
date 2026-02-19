import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button } from '../common';
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
  const [error, setError] = useState<string | null>(null);

  // Track the DB id for this template (set immediately for edits, after first save for creates)
  const [templateId, setTemplateId] = useState<string | undefined>(template?.id);
  const isEditing = !!template;

  // Auto-save refs
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const nameRef = useRef(name);
  const exercisesRef = useRef(exercises);

  // Keep refs in sync
  nameRef.current = name;
  exercisesRef.current = exercises;

  // Update state if template changes (e.g., navigating between templates)
  useEffect(() => {
    if (template) {
      setName(template.name);
      setExercises(template.exercises);
      setTemplateId(template.id);
      isInitialLoadRef.current = true;
    }
  }, [template?.id]);

  // Auto-save to DB (debounced)
  const flushSave = useCallback(async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const currentName = nameRef.current.trim();
    const currentExercises = exercisesRef.current;

    // Can't save without a name
    if (!currentName) return;

    try {
      if (templateId) {
        // Update existing
        await updateTemplate(templateId, {
          name: currentName,
          exercises: currentExercises,
        });
      } else {
        // Create new
        const id = await createTemplate({
          name: currentName,
          exercises: currentExercises,
        });
        setTemplateId(id);
        // Update URL to the new template's edit page (replace so back goes to list)
        navigate(`/templates/${id}/edit`, { replace: true });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }, [templateId, navigate]);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(flushSave, 600);
  }, [flushSave]);

  // Trigger auto-save when name or exercises change
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    scheduleAutoSave();
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [name, exercises, scheduleAutoSave]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
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
    setIsPickerOpen(false);
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
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExercises(
      exercises
        .filter((e) => e.exerciseId !== exerciseId)
        .map((e, index) => ({ ...e, order: index }))
    );
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const sorted = [...exercises].sort((a, b) => a.order - b.order);
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, moved);
    setExercises(sorted.map((e, index) => ({ ...e, order: index })));
  };

  const handleBack = () => {
    // Flush any pending save before navigating
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      // Fire-and-forget the final save
      const currentName = nameRef.current.trim();
      if (currentName && templateId) {
        updateTemplate(templateId, {
          name: currentName,
          exercises: exercisesRef.current,
        });
      }
    }
    if (isEditing && onSave) {
      onSave();
    } else if (templateId) {
      navigate(`/templates/${templateId}`);
    } else {
      navigate('/templates');
    }
  };

  const existingExerciseIds = exercises.map((e) => e.exerciseId);

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <Input
          label="Template Name"
          placeholder="e.g., Push Day, Upper Body A"
          value={name}
          onChange={handleNameChange}
          onBlur={flushSave}
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
          onClick={handleBack}
        >
          ← Back
        </Button>
      </div>

      <ExercisePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAddExercise}
        excludeIds={existingExerciseIds}
        title="Add Exercise"
      />
    </div>
  );
}
