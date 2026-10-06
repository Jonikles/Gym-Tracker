import { useMemo } from 'react';
import { calculateOverloadSuggestion, DEFAULT_WEIGHT_INCREMENT } from '../../utils/overload';
import { useSetting } from '../../hooks/useSettings';
import type { TemplateExercise, ExerciseField, Set } from '../../types';
import styles from './OverloadHint.module.css';

interface OverloadHintProps {
  /** Sets from the last completed session of this exercise (undefined while loading) */
  previousSets: Set[] | undefined;
  templateExercise?: TemplateExercise;
  defaultFields?: ExerciseField[];
}

export function OverloadHint({ previousSets, templateExercise, defaultFields }: OverloadHintProps) {
  const weightIncrementSetting = useSetting('weightIncrement');
  const weightIncrement =
    typeof weightIncrementSetting === 'number' && weightIncrementSetting > 0
      ? weightIncrementSetting
      : DEFAULT_WEIGHT_INCREMENT;

  const suggestion = useMemo(() => {
    if (!previousSets || previousSets.length === 0) return null;
    return calculateOverloadSuggestion(
      previousSets,
      templateExercise?.targetReps,
      templateExercise?.weight,
      weightIncrement,
      defaultFields
    );
  }, [previousSets, templateExercise?.targetReps, templateExercise?.weight, weightIncrement, defaultFields]);

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
