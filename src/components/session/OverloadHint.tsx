import { useProgressiveOverload } from '../../hooks/useProgressiveOverload';
import type { TemplateExercise, ExerciseField } from '../../types';
import styles from './OverloadHint.module.css';

interface OverloadHintProps {
  exerciseId: string;
  templateExercise?: TemplateExercise;
  defaultFields?: ExerciseField[];
}

export function OverloadHint({ exerciseId, templateExercise, defaultFields }: OverloadHintProps) {
  const { suggestion, isLoading } = useProgressiveOverload(exerciseId, templateExercise, defaultFields);

  if (isLoading) {
    return null;
  }

  if (!suggestion || suggestion.type === 'no_data') {
    return null;
  }

  const isIncrease = ['increase_weight', 'increase_reps', 'increase_time', 'increase_distance'].includes(suggestion.type);

  const getClassName = () => {
    if (isIncrease) return styles.increase;
    if (suggestion.type === 'same_weight') return styles.maintain;
    if (suggestion.type === 'deload') return styles.deload;
    return '';
  };

  return (
    <div className={`${styles.hint} ${getClassName()}`}>
      <span className={styles.icon}>
        {isIncrease && '↑'}
        {suggestion.type === 'same_weight' && '→'}
        {suggestion.type === 'deload' && '↓'}
      </span>
      <span className={styles.message}>{suggestion.message}</span>
    </div>
  );
}
