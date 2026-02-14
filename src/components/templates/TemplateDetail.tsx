import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ConfirmDialog } from '../common';
import { TemplateForm } from './TemplateForm';
import { useExercise } from '../../hooks/useExercises';
import {
  useTemplate,
  archiveTemplate,
  restoreTemplate,
  duplicateTemplate,
  deleteTemplate,
} from '../../hooks/useTemplates';
import type { TemplateExercise } from '../../types';
import styles from './TemplateDetail.module.css';

function ExerciseSummary({ exercise }: { exercise: TemplateExercise }) {
  const exerciseData = useExercise(exercise.exerciseId);

  // Summarize sets info
  const setCount = exercise.sets.length;
  const warmupCount = exercise.sets.filter(s => s.isWarmup).length;
  const targetReps = exercise.targetReps;
  
  // Check for non-standard techniques
  const techniques = [...new Set(exercise.sets.map(s => s.intensityTechnique).filter(t => t !== 'standard'))];

  return (
    <div className={styles.exerciseSummary}>
      <span className={styles.exerciseName}>{exerciseData?.name ?? 'Loading...'}</span>
      <span className={styles.exerciseDetail}>
        {setCount} sets × {targetReps}
        {warmupCount > 0 && ` (${warmupCount} warmup)`}
        {exercise.weight && ` @ ${exercise.weight}kg`}
        {techniques.map(t => (
          <span key={t} className={styles.technique}>{t}</span>
        ))}
      </span>
    </div>
  );
}

interface TemplateDetailProps {
  templateId: string;
}

export function TemplateDetail({ templateId }: TemplateDetailProps) {
  const navigate = useNavigate();
  const template = useTemplate(templateId);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  if (!template) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  const handleDuplicate = async () => {
    const newId = await duplicateTemplate(templateId);
    navigate(`/templates/${newId}`);
  };

  const handleArchive = async () => {
    await archiveTemplate(templateId);
    navigate('/templates');
  };

  const handleRestore = async () => {
    await restoreTemplate(templateId);
  };

  const handleDelete = async () => {
    await deleteTemplate(templateId);
    navigate('/templates');
  };

  const sortedExercises = [...template.exercises].sort((a, b) => a.order - b.order);
  const totalSets = template.exercises.reduce((sum, e) => sum + e.sets.length, 0);

  if (isEditing) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Button variant="ghost" onClick={() => setIsEditing(false)}>
            ← Cancel Edit
          </Button>
        </header>
        <TemplateForm template={template} onSave={() => setIsEditing(false)} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button variant="ghost" onClick={() => navigate('/templates')}>
          ← Back
        </Button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{template.name}</h1>
          <div className={styles.meta}>
            <span>{template.exercises.length} exercises</span>
            <span>•</span>
            <span>{totalSets} total sets</span>
            {template.isArchived && (
              <span className={styles.archived}>Archived</span>
            )}
          </div>
        </div>
        
        <div className={styles.actions}>
            {!template.isArchived && (
                <>
                <Button variant="secondary" onClick={() => navigate(`/templates/${template.id}/edit`)}>
                    Edit
                </Button>
                <Button variant="ghost" onClick={handleDuplicate}>
                    Duplicate
                </Button>
                <Button variant="ghost" onClick={() => setShowArchiveConfirm(true)}>
                    Archive
                </Button>
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                    Delete
                </Button>
                </>
            )}
            {template.isArchived && (
                <>
                <Button variant="secondary" onClick={handleRestore}>
                    Restore
                </Button>
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                    Delete
                </Button>
                </>
            )}
            </div>
      </header>

      <div className={styles.exercises}>
        <h2>Exercises</h2>
        <div className={styles.exerciseList}>
          {sortedExercises.map((exercise, index) => (
            <div key={exercise.exerciseId} className={styles.exerciseRow}>
              <span className={styles.exerciseNumber}>{index + 1}</span>
              <ExerciseSummary exercise={exercise} />
            </div>
          ))}
          {template.exercises.length === 0 && (
            <p className={styles.empty}>No exercises in this template.</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Template"
        message={`Permanently delete "${template.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Archive Template"
        message={`Archive "${template.name}"? This will remove it from the template list but past workouts using it will be preserved.`}
        confirmLabel="Archive"
        variant="danger"
      />
    </div>
  );
}
