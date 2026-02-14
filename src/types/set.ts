import type { IntensityTechnique } from './template';

/**
 * Re-export IntensityTechnique for convenience
 */
export type { IntensityTechnique } from './template';

/**
 * Technique-specific data for myo reps
 */
export interface MyoRepsTechniqueData {
  activationReps: number;
  miniSets: number[]; // Reps per mini-set
}

/**
 * Technique-specific data for drop sets
 */
export interface DropSetTechniqueData {
  drops: Array<{ weight: number; reps: number }>;
}

/**
 * Technique-specific data for cluster sets
 */
export interface ClusterTechniqueData {
  clusters: number[]; // Reps per cluster
}

/**
 * Technique-specific data for partials (LLP)
 */
export interface PartialsTechniqueData {
  mainReps: number;
  partialReps: number;
  partialWeight: number;
}

/**
 * Union type for all technique data
 */
export type TechniqueData =
  | MyoRepsTechniqueData
  | DropSetTechniqueData
  | ClusterTechniqueData
  | PartialsTechniqueData;

/**
 * Set entity - a single set logged during a workout
 * v1.1: Removed RIR, restTime, tempo, notes
 * v1.2: Added targetReps for template-based sets
 */
export interface Set {
  id: string;
  sessionExerciseId: string;
  order: number;
  weight?: number;
  reps?: number;
  targetReps?: string; // Target from template, e.g. "8-12"
  isWarmup: boolean;
  intensityTechnique: IntensityTechnique;
  techniqueData?: TechniqueData;
  createdAt: number;
}
