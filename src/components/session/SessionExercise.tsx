import { useState, useCallback } from 'react';
import { Button, Card } from '../common';
import { SetRow } from './SetRow';
import { SetHistory } from './SetHistory';
import { OverloadHint } from './OverloadHint';
import { useSets, createSet, quickFillFromPrevious } from '../../hooks/useSets';
import { useExercise } from '../../hooks/useExercises';
import type { SessionExercise as SessionExerciseType, ExerciseField, TemplateExercise } from '../../types';
import styles from './SessionExercise.module.css';

interface SessionExerciseProps {
  sessionExercise: SessionExerciseType;
  templateExercise?: TemplateExercise;
  onRemove: () => void;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  showValidation?: boolean;
}

export function SessionExercise({
  sessionExercise,
  templateExercise,
  onRemove,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  showValidation,
}: SessionExerciseProps) {
  const exercise = useExercise(sessionExercise.exerciseId);
  const sets = useSets(sessionExercise.id) ?? [];
  const [isCollapsed, setIsCollapsed] = useState(false);

  const defaultFields: ExerciseField[] = exercise?.defaultFields ?? ['weight', 'reps'];

  const handleAddSet = useCallback(async () => {
    // Pre-fill from last set if exists, or from template defaults
    const lastSet = sets[sets.length - 1];
    // Get default technique from template's first working set
    const firstWorkingTemplateSet = templateExercise?.sets.find(s => !s.isWarmup);
    await createSet({
      sessionExerciseId: sessionExercise.id,
      weight: lastSet?.weight ?? templateExercise?.weight,
      reps: lastSet?.reps,
      isWarmup: false,
      intensityTechnique: firstWorkingTemplateSet?.intensityTechnique ?? 'standard',
    });
  }, [sessionExercise.id, sets, templateExercise]);

  const handleQuickFill = useCallback(async () => {
    await quickFillFromPrevious(sessionExercise.id, sessionExercise.exerciseId);
  }, [sessionExercise.id, sessionExercise.exerciseId]);

  if (!exercise) {
    return (
      <Card className={styles.card}>
        <span className={styles.missing}>Exercise not found</span>
      </Card>
    );
  }

  // Count working sets for numbering
  let workingSetNumber = 0;

  // Show targets if from template
  const getTargetInfo = () => {
    if (!templateExercise) return null;
    const setCount = templateExercise.sets.length;
    const targetReps = templateExercise.targetReps;
    const firstWorkingSet = templateExercise.sets.find(s => !s.isWarmup);
    const technique = firstWorkingSet?.intensityTechnique;
    let info = `${setCount}×${targetReps}`;
    if (templateExercise.weight) info += ` @ ${templateExercise.weight}kg`;
    if (technique && technique !== 'standard') info += ` (${technique})`;
    return info;
  };
  const targetInfo = getTargetInfo();

  return (
    <div
      className={`${styles.container} ${isDragging ? styles.dragging : ''} ${sessionExercise.groupId ? styles.grouped : ''}`}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={styles.header}>
        {onDragStart && <span className={styles.dragHandle}>⋮⋮</span>}
        <div className={styles.titleRow} onClick={() => setIsCollapsed(!isCollapsed)}>
          <h3 className={styles.name}>{exercise.name}</h3>
          {sessionExercise.groupType && (
            <span className={styles.groupBadge}>{sessionExercise.groupType}</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} title="Remove exercise">
          ×
        </Button>
      </div>

      {targetInfo && (
        <div className={styles.target}>Target: {targetInfo}</div>
      )}

      {!isCollapsed && (
        <>
          <OverloadHint
            exerciseId={sessionExercise.exerciseId}
            templateExercise={templateExercise}
          />

          <SetHistory exerciseId={sessionExercise.exerciseId} />

          <div className={styles.sets}>
            {sets.map((set) => {
              if (!set.isWarmup) workingSetNumber++;
              return (
                <SetRow
                  key={set.id}
                  set={set}
                  setNumber={workingSetNumber}
                  defaultFields={defaultFields}
                  exerciseId={sessionExercise.exerciseId}
                  onDelete={() => {}}
                  showValidation={showValidation}
                />
              );
            })}
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" size="sm" onClick={handleAddSet}>
              + Add Set
            </Button>
            {sets.length === 0 && (
              <Button variant="ghost" size="sm" onClick={handleQuickFill}>
                Quick Fill
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
