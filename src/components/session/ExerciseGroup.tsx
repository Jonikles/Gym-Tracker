import { memo } from 'react';
import { Button } from '../common';
import { SessionExercise } from './SessionExercise';
import type { SessionExercise as SessionExerciseType, TemplateExercise } from '../../types';
import styles from './ExerciseGroup.module.css';

interface ExerciseGroupProps {
  groupId: string;
  groupType: 'superset' | 'circuit';
  exercises: SessionExerciseType[];
  templateExerciseMap: Map<string, TemplateExercise>;
  onRemoveExercise: (sessionExerciseId: string) => void;
  onSwitchProgression?: (sessionExerciseId: string, newExerciseId: string) => Promise<string | undefined>;
  showValidation?: boolean;
  onUngroup?: (groupId: string) => void;
}

export const ExerciseGroup = memo(function ExerciseGroup({
  groupId,
  groupType,
  exercises,
  templateExerciseMap,
  onRemoveExercise,
  onSwitchProgression,
  showValidation,
  onUngroup,
}: ExerciseGroupProps) {
  const sortedExercises = [...exercises].sort(
    (a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0)
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.label}>
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
          const templateExercise = se.progressionId
            ? templateExerciseMap.get(`prog:${se.progressionId}`)
            : templateExerciseMap.get(se.exerciseId);

          return (
            <SessionExercise
              key={se.id}
              sessionExercise={se}
              templateExercise={templateExercise}
              onRemove={onRemoveExercise}
              onSwitchProgression={onSwitchProgression}
              showValidation={showValidation}
            />
          );
        })}
      </div>
    </div>
  );
});
