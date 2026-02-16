import type { Set, ExerciseField } from '../types';

/**
 * Progressive overload suggestion types
 */
export type OverloadSuggestionType =
  | 'increase_weight'
  | 'increase_reps'
  | 'increase_time'
  | 'increase_distance'
  | 'same_weight'
  | 'deload'
  | 'no_data';

/**
 * Progressive overload suggestion
 */
export interface OverloadSuggestion {
  type: OverloadSuggestionType;
  message: string;
  suggestedWeight?: number;
  previousWeight?: number;
  setsHit?: number;
  totalSets?: number;
}

/**
 * Default weight increment in kg
 */
export const DEFAULT_WEIGHT_INCREMENT = 2.5;

/**
 * Parse rep target (can be number or range like "8-12")
 * Returns the minimum reps needed to meet the target
 */
export function parseRepTarget(target: number | string | undefined): number | undefined {
  if (target === undefined) return undefined;
  
  if (typeof target === 'number') return target;
  
  const str = String(target);
  
  // Handle range like "8-12" - use the lower bound
  if (str.includes('-')) {
    const [min] = str.split('-').map((s) => parseInt(s.trim(), 10));
    return isNaN(min) ? undefined : min;
  }
  
  const num = parseInt(str, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Calculate progressive overload suggestion based on previous performance
 * 
 * Logic from feature specs:
 * - All sets met or exceeded target → suggest weight increase
 * - Some sets met target → suggest same weight
 * - No sets met target → suggest deload or same weight
 * - No previous data → no suggestion
 */
export function calculateOverloadSuggestion(
  previousSets: Set[],
  targetReps: number | string | undefined,
  targetWeight: number | undefined,
  weightIncrement: number = DEFAULT_WEIGHT_INCREMENT,
  defaultFields: ExerciseField[] = ['weight', 'reps']
): OverloadSuggestion {
  // Filter to working sets only
  const workingSets = previousSets.filter((s) => !s.isWarmup);

  if (workingSets.length === 0) {
    return {
      type: 'no_data',
      message: 'No previous data',
    };
  }

  const hasWeight = defaultFields.includes('weight');
  const hasReps = defaultFields.includes('reps');
  const hasTime = defaultFields.includes('time');
  const hasDistance = defaultFields.includes('distance');

  // For exercises without weight (bodyweight, time-only, distance-only)
  if (!hasWeight) {
    return calculateNonWeightOverload(workingSets, targetReps, { hasReps, hasTime, hasDistance });
  }

  // Standard weight-based overload logic
  const minReps = parseRepTarget(targetReps);

  // If no targets defined, report what was done last time
  if (minReps === undefined && targetWeight === undefined) {
    const maxWeight = Math.max(...workingSets.map((s) => s.weight ?? 0));
    return {
      type: 'no_data',
      message: `Last session: ${workingSets.length} sets at ${maxWeight}kg`,
      previousWeight: maxWeight,
    };
  }

  // Determine the weight used in previous session
  const previousWeight = Math.max(...workingSets.map((s) => s.weight ?? 0));
  const compareWeight = targetWeight ?? previousWeight;

  // Count how many sets met the target
  let setsHit = 0;
  for (const set of workingSets) {
    const setWeight = set.weight ?? 0;
    const setReps = set.reps ?? 0;

    const metWeight = setWeight >= compareWeight;
    const metReps = minReps === undefined || setReps >= minReps;

    if (metWeight && metReps) {
      setsHit++;
    }
  }

  const totalSets = workingSets.length;
  const allHit = setsHit === totalSets;
  const someHit = setsHit > 0;

  if (allHit) {
    const suggestedWeight = previousWeight + weightIncrement;
    return {
      type: 'increase_weight',
      message: `All ${totalSets} sets hit. Try ${suggestedWeight}kg`,
      suggestedWeight,
      previousWeight,
      setsHit,
      totalSets,
    };
  }

  if (someHit) {
    return {
      type: 'same_weight',
      message: `${setsHit}/${totalSets} sets hit target. Stay at ${previousWeight}kg`,
      suggestedWeight: previousWeight,
      previousWeight,
      setsHit,
      totalSets,
    };
  }

  const deloadWeight = Math.max(0, previousWeight - weightIncrement);
  return {
    type: 'deload',
    message: `Struggled at ${previousWeight}kg. Consider ${deloadWeight}kg or repeat`,
    suggestedWeight: deloadWeight,
    previousWeight,
    setsHit: 0,
    totalSets,
  };
}

/**
 * Overload suggestions for exercises without weight (bodyweight, time-based, distance-based)
 */
function calculateNonWeightOverload(
  workingSets: Set[],
  targetReps: number | string | undefined,
  fields: { hasReps: boolean; hasTime: boolean; hasDistance: boolean }
): OverloadSuggestion {
  const totalSets = workingSets.length;

  if (fields.hasReps) {
    const maxReps = Math.max(...workingSets.map((s) => s.reps ?? 0));
    const minReps = parseRepTarget(targetReps);
    const allHit = minReps !== undefined && workingSets.every((s) => (s.reps ?? 0) >= minReps);

    if (allHit) {
      return {
        type: 'increase_reps',
        message: `All ${totalSets} sets hit ${minReps}+ reps. Try ${maxReps + 1} reps`,
        setsHit: totalSets,
        totalSets,
      };
    }

    return {
      type: 'no_data',
      message: `Last session: ${totalSets} sets, max ${maxReps} reps`,
    };
  }

  if (fields.hasTime) {
    const maxTime = Math.max(...workingSets.map((s) => s.time ?? 0));
    return {
      type: 'increase_time',
      message: `Last session: ${maxTime}s. Try ${maxTime + 5}s`,
      setsHit: totalSets,
      totalSets,
    };
  }

  if (fields.hasDistance) {
    const maxDistance = Math.max(...workingSets.map((s) => s.distance ?? 0));
    return {
      type: 'increase_distance',
      message: `Last session: ${maxDistance}m. Try ${maxDistance + 5}m`,
      setsHit: totalSets,
      totalSets,
    };
  }

  return { type: 'no_data', message: 'No previous data' };
}
