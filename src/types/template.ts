/**
 * Allowed intensity techniques for template exercises
 */
export type IntensityTechnique =
  | 'standard'
  | 'failure'
  | 'myoreps'
  | 'dropset'
  | 'forcedreps'
  | 'partials'
  | 'cluster';

/**
 * Individual set definition within a template exercise
 * Each set can be marked as warmup and have a specific technique
 */
export interface TemplateSet {
  order: number;
  isWarmup: boolean;
  intensityTechnique: IntensityTechnique;
  notes?: string;
}

/**
 * Exercise embedded in a template (with defaults)
 * targetReps is defined once for the exercise, not per set
 */
export interface TemplateExercise {
  exerciseId: string; // For progression slots: the default/last-used exercise
  progressionId?: string; // If present, this is a progression slot (references PROGRESSION_DEFINITIONS id)
  order: number;
  sets: TemplateSet[]; // Array of set definitions
  targetReps: string; // e.g., "8-12" or "5" - applies to all working sets
  weight?: number; // Optional target weight
  groupId?: string; // Groups exercises together (superset/circuit)
  groupType?: 'superset' | 'circuit';
  groupOrder?: number; // Position within group
  notes?: string;
}

/**
 * Template entity - a reusable workout definition
 */
export interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}
