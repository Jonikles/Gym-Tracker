import { SessionExercise } from './SessionExercise';
import type { SessionExercise as SessionExerciseType, TemplateExercise } from '../../types';
import styles from './ExerciseGroup.module.css';

interface ExerciseGroupProps {
  groupType: 'superset' | 'circuit';
  exercises: SessionExerciseType[];
  templateExerciseMap: Map<string, TemplateExercise>;
  onRemoveExercise: (sessionExerciseId: string) => void;
  showValidation?: boolean;
}

export function ExerciseGroup({
  groupType,
  exercises,
  templateExerciseMap,
  onRemoveExercise,
  showValidation,
}: ExerciseGroupProps) {
  const sortedExercises = [...exercises].sort(
    (a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0)
  );

  return (
    <div className={styles.container}>
      <div className={styles.label}>
        {groupType === 'superset' ? 'Superset' : 'Circuit'}
      </div>
      <div className={styles.exercises}>
        {sortedExercises.map((se) => (
          <SessionExercise
            key={se.id}
            sessionExercise={se}
            templateExercise={templateExerciseMap.get(se.exerciseId)}
            onRemove={() => onRemoveExercise(se.id)}
            showValidation={showValidation}
          />
        ))}
      </div>
    </div>
  );
}
