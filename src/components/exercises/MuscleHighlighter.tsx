import Model from 'react-body-highlighter';
import type { IExerciseData, Muscle } from 'react-body-highlighter';
import { useSetting } from '../../hooks/useSettings';
import type { MuscleGroup } from '../../types/exercise';
import styles from './MuscleHighlighter.module.css';

/**
 * Map app MuscleGroup names → react-body-highlighter Muscle names.
 * null = no direct equivalent in the library (omit).
 */
const MUSCLE_MAP: Record<MuscleGroup, Muscle | null> = {
  // Lower Body
  'calves':          'calves',
  'quads':           'quadriceps',
  'hamstrings':      'hamstring',
  'glutes':          'gluteal',
  'adductors':       'adductor',
  'abductors':       'abductors',
  // Core
  'lower-abs':       'abs',
  'upper-abs':       'abs',
  'obliques':        'obliques',
  // Chest
  'lower-chest':     'chest',
  'mid-chest':       'chest',
  'upper-chest':     'chest',
  // Arms
  'forearms':        'forearm',
  'triceps':         'triceps',
  'biceps':          'biceps',
  'brachioradialis': 'forearm',
  // Shoulders
  'front-delts':     'front-deltoids',
  'side-delts':      'front-deltoids',
  'rear-delts':      'back-deltoids',
  // Back
  'traps':           'trapezius',
  'rhomboids':       'upper-back',
  'lats-upper':      'upper-back',
  'lats-lower':      'lower-back',
  'erector-spinae':  'lower-back',
  // Neck
  'neck':            'neck',
};

const THEME_COLORS = {
  dark: { body: '#3a3a3a', highlight: '#ef4444' },
  light: { body: '#c8c8c8', highlight: '#dc2626' },
};

interface MuscleHighlighterProps {
  name: string;
  muscleGroups: MuscleGroup[];
}

export function MuscleHighlighter({ name, muscleGroups }: MuscleHighlighterProps) {
  const theme = useSetting('theme');
  const colors = THEME_COLORS[theme] ?? THEME_COLORS.dark;

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
            bodyColor={colors.body}
            highlightedColors={[colors.highlight]}
            svgStyle={{ width: '100%', height: 'auto' }}
          />
          <span className={styles.viewLabel}>Front</span>
        </div>
        <div className={styles.view}>
          <Model
            data={data}
            type="posterior"
            bodyColor={colors.body}
            highlightedColors={[colors.highlight]}
            svgStyle={{ width: '100%', height: 'auto' }}
          />
          <span className={styles.viewLabel}>Back</span>
        </div>
      </div>
    </div>
  );
}
