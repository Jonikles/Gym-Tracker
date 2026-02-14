import { useProgressiveOverload } from '../../hooks/useProgressiveOverload';
import type { TemplateExercise } from '../../types';
import styles from './OverloadHint.module.css';

interface OverloadHintProps {
  exerciseId: string;
  templateExercise?: TemplateExercise;
}

export function OverloadHint({ exerciseId, templateExercise }: OverloadHintProps) {
  const { suggestion, isLoading } = useProgressiveOverload(exerciseId, templateExercise);

  if (isLoading) {
    return null;
  }

  if (!suggestion || suggestion.type === 'no_data') {
    return null;
  }

  const getClassName = () => {
    switch (suggestion.type) {
      case 'increase_weight':
        return styles.increase;
      case 'same_weight':
        return styles.maintain;
      case 'deload':
        return styles.deload;
      default:
        return '';
    }
  };

  return (
    <div className={`${styles.hint} ${getClassName()}`}>
      <span className={styles.icon}>
        {suggestion.type === 'increase_weight' && '↑'}
        {suggestion.type === 'same_weight' && '→'}
        {suggestion.type === 'deload' && '↓'}
      </span>
      <span className={styles.message}>{suggestion.message}</span>
    </div>
  );
}
