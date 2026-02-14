/**
 * Muscle Group Migration Mapping
 * 
 * Maps old muscle group keys to new specific muscle group keys.
 * Used during database migration and seed file updates.
 */

import type { MuscleGroup } from '../types';

/**
 * Direct 1:1 mappings where old key maps to single new key
 */
export const directMappings: Record<string, MuscleGroup> = {
  // These stay the same
  'calves': 'calves',
  'quads': 'quads',
  'hamstrings': 'hamstrings',
  'glutes': 'glutes',
  'obliques': 'obliques',
  'forearms': 'forearms',
  'triceps': 'triceps',
  'biceps': 'biceps',
  'traps': 'traps',
  'rhomboids': 'rhomboids',
  'adductors': 'adductors',
  
  // Delts - already specific in some exercises
  'front delts': 'front-delts',
  'side delts': 'side-delts',
  'rear delts': 'rear-delts',
};

/**
 * Context-dependent mappings
 * These old keys need to be mapped based on the exercise name/context
 */
export const contextMappings = {
  /**
   * 'chest' → depends on exercise angle
   * - Incline exercises → 'upper-chest'
   * - Decline exercises → 'lower-chest'
   * - Flat/general exercises → 'mid-chest'
   */
  'chest': {
    inclineKeywords: ['incline'],
    declineKeywords: ['decline', 'dip', 'low cable'],
    mappings: {
      incline: 'upper-chest' as MuscleGroup,
      decline: 'lower-chest' as MuscleGroup,
      default: 'mid-chest' as MuscleGroup,
    }
  },

  /**
   * 'shoulders' → depends on exercise type
   */
  'shoulders': {
    lateralKeywords: ['lateral', 'lu raise'],
    rearKeywords: ['rear', 'face pull', 'reverse'],
    frontKeywords: ['front raise'],
    mappings: {
      lateral: 'side-delts' as MuscleGroup,
      rear: 'rear-delts' as MuscleGroup,
      front: 'front-delts' as MuscleGroup,
      default: 'front-delts' as MuscleGroup,
    }
  },

  /**
   * 'lats' → split into upper and lower
   */
  'lats': {
    upperKeywords: ['pulldown', 'pull-up', 'chin-up', 'pullup', 'chinup'],
    lowerKeywords: ['row'],
    mappings: {
      upper: ['lats-upper', 'lats-lower'] as MuscleGroup[],
      lower: ['lats-upper', 'lats-lower'] as MuscleGroup[],
      default: ['lats-upper', 'lats-lower'] as MuscleGroup[],
    }
  },

  /**
   * 'back' → depends on exercise
   */
  'back': {
    mappings: {
      default: 'erector-spinae' as MuscleGroup,
    }
  },

  /**
   * 'abs' → depends on exercise
   */
  'abs': {
    lowerKeywords: ['leg raise', 'knee raise', 'reverse crunch', 'hanging'],
    upperKeywords: ['crunch', 'sit-up', 'situp'],
    mappings: {
      lower: 'lower-abs' as MuscleGroup,
      upper: 'upper-abs' as MuscleGroup,
      default: ['upper-abs', 'lower-abs'] as MuscleGroup[],
    }
  },

  /**
   * 'legs' → too vague, split based on context
   */
  'legs': {
    mappings: {
      default: ['quads', 'hamstrings', 'glutes'] as MuscleGroup[],
    }
  },
};

/**
 * Helper function to map a single old muscle group to new one(s)
 * based on exercise name context
 */
export function mapMuscleGroup(oldMuscle: string, exerciseName: string): MuscleGroup[] {
  const nameLower = exerciseName.toLowerCase();
  
  // Check direct mappings first
  if (directMappings[oldMuscle]) {
    return [directMappings[oldMuscle]];
  }
  
  // Check context mappings
  if (oldMuscle === 'chest') {
    const ctx = contextMappings.chest;
    if (ctx.inclineKeywords.some(k => nameLower.includes(k))) {
      return [ctx.mappings.incline];
    }
    if (ctx.declineKeywords.some(k => nameLower.includes(k))) {
      return [ctx.mappings.decline];
    }
    return [ctx.mappings.default];
  }
  
  if (oldMuscle === 'shoulders') {
    const ctx = contextMappings.shoulders;
    if (ctx.lateralKeywords.some(k => nameLower.includes(k))) {
      return [ctx.mappings.lateral];
    }
    if (ctx.rearKeywords.some(k => nameLower.includes(k))) {
      return [ctx.mappings.rear];
    }
    if (ctx.frontKeywords.some(k => nameLower.includes(k))) {
      return [ctx.mappings.front];
    }
    return [ctx.mappings.default];
  }
  
  if (oldMuscle === 'lats') {
    return contextMappings.lats.mappings.default;
  }
  
  if (oldMuscle === 'back') {
    return [contextMappings.back.mappings.default];
  }
  
  if (oldMuscle === 'abs') {
    const ctx = contextMappings.abs;
    if (ctx.lowerKeywords.some(k => nameLower.includes(k))) {
      return [ctx.mappings.lower];
    }
    if (ctx.upperKeywords.some(k => nameLower.includes(k))) {
      return [ctx.mappings.upper];
    }
    return ctx.mappings.default;
  }
  
  if (oldMuscle === 'legs') {
    return contextMappings.legs.mappings.default;
  }
  
  // Unknown muscle - return empty (will need manual review)
  console.warn(`Unknown muscle group: ${oldMuscle} in exercise: ${exerciseName}`);
  return [];
}

/**
 * Map an entire exercise's muscle groups to new format
 */
export function mapExerciseMuscles(
  oldMuscles: string[],
  exerciseName: string
): MuscleGroup[] {
  const newMuscles: Set<MuscleGroup> = new Set();
  
  for (const muscle of oldMuscles) {
    const mapped = mapMuscleGroup(muscle, exerciseName);
    mapped.forEach(m => newMuscles.add(m));
  }
  
  return Array.from(newMuscles);
}
