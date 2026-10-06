import Model from 'react-body-highlighter';
import type { IExerciseData, Muscle } from 'react-body-highlighter';
import type { MuscleGroup } from '../../types/exercise';
import { MUSCLE_MAP, MUSCLE_COLORS } from '../analytics/muscleMap';
import styles from './MuscleHighlighter.module.css';

interface MuscleHighlighterProps {
  name: string;
  muscleGroups: MuscleGroup[];
}

export function MuscleHighlighter({ name, muscleGroups }: MuscleHighlighterProps) {
  const mapped = [
    ...new Set(
      muscleGroups
        .map((mg) => MUSCLE_MAP[mg])
        .filter((m): m is Muscle => m !== null)
    ),
  ];

  if (mapped.length === 0) return null;

  const data: IExerciseData[] = [{ name, muscles: mapped }];

  return (
    <div className={styles.container}>
      <span className={styles.sectionLabel}>Muscles Worked</span>
      <div className={styles.views}>
        <div className={styles.view}>
          <Model
            data={data}
            type="anterior"
            bodyColor={MUSCLE_COLORS.body}
            highlightedColors={[MUSCLE_COLORS.highlight]}
            svgStyle={{ width: '100%', height: 'auto' }}
          />
          <span className={styles.viewLabel}>Front</span>
        </div>
        <div className={styles.view}>
          <Model
            data={data}
            type="posterior"
            bodyColor={MUSCLE_COLORS.body}
            highlightedColors={[MUSCLE_COLORS.highlight]}
            svgStyle={{ width: '100%', height: 'auto' }}
          />
          <span className={styles.viewLabel}>Back</span>
        </div>
      </div>
    </div>
  );
}
