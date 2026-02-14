import type { Set, TechniqueData, MyoRepsTechniqueData, DropSetTechniqueData, ClusterTechniqueData, PartialsTechniqueData } from '../types';

/**
 * Type guards for technique data
 */
function isMyoRepsData(data: TechniqueData): data is MyoRepsTechniqueData {
  return 'activationReps' in data && 'miniSets' in data;
}

function isDropSetData(data: TechniqueData): data is DropSetTechniqueData {
  return 'drops' in data;
}

function isClusterData(data: TechniqueData): data is ClusterTechniqueData {
  return 'clusters' in data;
}

function isPartialsData(data: TechniqueData): data is PartialsTechniqueData {
  return 'mainReps' in data && 'partialReps' in data;
}

/**
 * Calculate total volume for a set, accounting for technique-specific data
 * 
 * Volume formulas by technique:
 * - Standard/Failure/ForcedReps: weight × reps
 * - Myo Reps: weight × (activationReps + sum(miniSets))
 * - Drop Set: sum(drops.map(d => d.weight × d.reps))
 * - Cluster: weight × sum(clusters)
 * - Partials: (weight × mainReps) + (partialWeight × partialReps)
 */
export function getSetVolume(set: Set): number {
  const weight = set.weight ?? 0;
  const reps = set.reps ?? 0;

  // If no technique data, use simple calculation
  if (!set.techniqueData) {
    return weight * reps;
  }

  switch (set.intensityTechnique) {
    case 'myoreps': {
      if (isMyoRepsData(set.techniqueData)) {
        const { activationReps, miniSets } = set.techniqueData;
        const totalMiniReps = miniSets.reduce((sum, r) => sum + r, 0);
        return weight * (activationReps + totalMiniReps);
      }
      return weight * reps;
    }

    case 'dropset': {
      if (isDropSetData(set.techniqueData)) {
        return set.techniqueData.drops.reduce(
          (sum, drop) => sum + drop.weight * drop.reps,
          0
        );
      }
      return weight * reps;
    }

    case 'cluster': {
      if (isClusterData(set.techniqueData)) {
        const totalClusterReps = set.techniqueData.clusters.reduce((sum, r) => sum + r, 0);
        return weight * totalClusterReps;
      }
      return weight * reps;
    }

    case 'partials': {
      if (isPartialsData(set.techniqueData)) {
        const { mainReps, partialReps, partialWeight } = set.techniqueData;
        return (weight * mainReps) + (partialWeight * partialReps);
      }
      return weight * reps;
    }

    default:
      return weight * reps;
  }
}

/**
 * Get the "primary" weight and reps from a set for PR detection
 * For partials, returns main set values (excluding partial reps)
 * For other techniques, returns the base weight/reps
 */
export function getPrimaryWeightAndReps(set: Set): { weight: number; reps: number } {
  const weight = set.weight ?? 0;
  let reps = set.reps ?? 0;

  // For partials, use mainReps from techniqueData if available
  if (set.intensityTechnique === 'partials' && set.techniqueData && isPartialsData(set.techniqueData)) {
    reps = set.techniqueData.mainReps;
  }

  return { weight, reps };
}

/**
 * Check if a technique is eligible for e1RM calculation
 * Only standard, failure, and forcedreps are eligible
 * Partials are eligible but only for the main set (handled in getPrimaryWeightAndReps)
 */
export function isE1RMEligible(technique: string): boolean {
  return ['standard', 'failure', 'forcedreps', 'partials'].includes(technique);
}
