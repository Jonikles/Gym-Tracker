/**
 * Allowed values for exercise default fields
 */
export type ExerciseField = 
  | 'weight' 
  | 'reps' 
  | 'time' 
  | 'distance';

/**
 * Valid muscle group keys (v1.1 expanded list)
 */
export type MuscleGroup =
  // Lower Body
  | 'calves'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'adductors'
  | 'abductors'
  // Core
  | 'lower-abs'
  | 'upper-abs'
  | 'obliques'
  // Chest
  | 'lower-chest'
  | 'mid-chest'
  | 'upper-chest'
  // Arms
  | 'forearms'
  | 'triceps'
  | 'biceps'
  | 'brachioradialis'
  // Shoulders
  | 'front-delts'
  | 'side-delts'
  | 'rear-delts'
  // Back
  | 'traps'
  | 'rhomboids'
  | 'lats-upper'
  | 'lats-lower'
  | 'erector-spinae'
  // Neck
  | 'neck';

/**
 * All valid muscle groups as an array (for iteration/validation)
 */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  // Lower Body
  'calves',
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'abductors',
  // Core
  'lower-abs',
  'upper-abs',
  'obliques',
  // Chest
  'lower-chest',
  'mid-chest',
  'upper-chest',
  // Arms
  'forearms',
  'triceps',
  'biceps',
  'brachioradialis',
  // Shoulders
  'front-delts',
  'side-delts',
  'rear-delts',
  // Back
  'traps',
  'rhomboids',
  'lats-upper',
  'lats-lower',
  'erector-spinae',
  // Neck
  'neck',
];

/**
 * Muscle group categories for UI grouping
 */
export const MUSCLE_GROUP_CATEGORIES: Record<string, MuscleGroup[]> = {
  'Lower Body': ['calves', 'quads', 'hamstrings', 'glutes', 'adductors', 'abductors'],
  'Core': ['lower-abs', 'upper-abs', 'obliques'],
  'Chest': ['lower-chest', 'mid-chest', 'upper-chest'],
  'Arms': ['forearms', 'triceps', 'biceps', 'brachioradialis'],
  'Shoulders': ['front-delts', 'side-delts', 'rear-delts'],
  'Back': ['traps', 'rhomboids', 'lats-upper', 'lats-lower', 'erector-spinae'],
  'Neck': ['neck'],
};

/**
 * Represents an exercise's membership in a progression chain.
 * An exercise can belong to multiple progressions with different levels.
 */
export interface ProgressionMembership {
  progressionId: string;
  level: number;
}

/**
 * Exercise entity - stored in exercises table
 */
export interface Exercise {
  id: string;
  name: string;
  parentId?: string;
  muscleGroups?: MuscleGroup[];
  movementPattern?: string;
  equipment?: string;
  defaultFields: ExerciseField[];
  progressionLevel?: number;
  progressionMemberships?: ProgressionMembership[];
  isPreset: boolean;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}
