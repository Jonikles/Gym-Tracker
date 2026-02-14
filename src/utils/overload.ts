import type { Set } from '../types';

/**
 * Progressive overload suggestion types
 */
export type OverloadSuggestionType = 
  | 'increase_weight'
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
  weightIncrement: number = DEFAULT_WEIGHT_INCREMENT
): OverloadSuggestion {
  // Filter to working sets only
  const workingSets = previousSets.filter((s) => !s.isWarmup);
  
  if (workingSets.length === 0) {
    return {
      type: 'no_data',
      message: 'No previous data',
    };
  }

  // Get the target values
  const minReps = parseRepTarget(targetReps);
  
  // If no targets defined, we can't make a suggestion
  if (minReps === undefined && targetWeight === undefined) {
    // Just report what was done last time
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
    
    // A set "hits" if it meets both weight and rep targets
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
    // All sets met targets - suggest weight increase
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
    // Partial success - suggest same weight
    return {
      type: 'same_weight',
      message: `${setsHit}/${totalSets} sets hit target. Stay at ${previousWeight}kg`,
      suggestedWeight: previousWeight,
      previousWeight,
      setsHit,
      totalSets,
    };
  }

  // No sets hit target - suggest deload or same weight
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
