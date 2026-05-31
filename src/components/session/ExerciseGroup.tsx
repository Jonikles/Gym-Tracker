import { Button } from '../common';
import { SessionExercise } from './SessionExercise';
import type { SessionExercise as SessionExerciseType, TemplateExercise } from '../../types';
import styles from './ExerciseGroup.module.css';

interface ExerciseGroupProps {
  groupType: 'superset' | 'circuit';
  exercises: SessionExerciseType[];
  templateExerciseMap: Map<string, TemplateExercise>;
  onRemoveExercise: (sessionExerciseId: string) => void;
  onSwitchProgression?: (sessionExerciseId: string, newExerciseId: string) => Promise<string | undefined>;
  showValidation?: boolean;
  onUngroup?: () => void;
}

export function ExerciseGroup({
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
          <Button variant="ghost" size="sm" onClick={onUngroup} className={styles.ungroupBtn}>
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
              onRemove={() => onRemoveExercise(se.id)}
              onSwitchProgression={onSwitchProgression}
              showValidation={showValidation}
            />
          );
        })}
      </div>
    </div>
  );
}
