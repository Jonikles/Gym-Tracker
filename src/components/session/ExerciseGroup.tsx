import { memo } from 'react';
import { Button } from '../common';
import { SessionExercise } from './SessionExercise';
import type { SessionExercise as SessionExerciseType, TemplateExercise } from '../../types';
import styles from './ExerciseGroup.module.css';

interface ExerciseGroupProps {
  groupId: string;
  groupType: 'superset' | 'circuit';
  exercises: SessionExerciseType[];
  onRemoveExercise: (sessionExerciseId: string) => void;
  onSwitchProgression?: (sessionExerciseId: string, newExerciseId: string) => Promise<string | undefined>;
  onSwitchVariant?: (sessionExerciseId: string, newExerciseId: string) => Promise<void>;
  /** Finds the template exercise for a session exercise (handles variant switches) */
  findTemplateExercise: (se: SessionExerciseType) => TemplateExercise | undefined;
  showValidation?: boolean;
  onUngroup?: (groupId: string) => void;
}

export const ExerciseGroup = memo(function ExerciseGroup({
  groupId,
  groupType,
  exercises,
  onRemoveExercise,
  onSwitchProgression,
  onSwitchVariant,
  findTemplateExercise,
  showValidation,
  onUngroup,
}: ExerciseGroupProps) {
  const sortedExercises = [...exercises].sort(
    (a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0)
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={`chip chip-accent ${styles.label}`}>
          {groupType === 'superset' ? 'Superset' : 'Circuit'}
        </div>
        {onUngroup && (
          <Button variant="ghost" onClick={() => onUngroup(groupId)} className={styles.ungroupBtn}>
            Unlink
          </Button>
        )}
      </div>
      <div className={styles.exercises}>
        {sortedExercises.map((se) => {
          const templateExercise = findTemplateExercise(se);

          return (
            <SessionExercise
              key={se.id}
              sessionExercise={se}
              templateExercise={templateExercise}
              onRemove={onRemoveExercise}
              onSwitchProgression={onSwitchProgression}
              onSwitchVariant={onSwitchVariant}
              showValidation={showValidation}
            />
          );
        })}
      </div>
    </div>
  );
});
