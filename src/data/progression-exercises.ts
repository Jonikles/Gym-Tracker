import type { MuscleGroup, ExerciseField, ProgressionMembership } from '../types';

export interface ProgressionExerciseDefinition {
  name: string;
  muscleGroups: MuscleGroup[];
  movementPattern: string;
  equipment: string;
  defaultFields: ExerciseField[];
  progressionMemberships: ProgressionMembership[];
}

export const PROGRESSION_EXERCISES: ProgressionExerciseDefinition[] = [
  // ============================================
  // HANDSTANDS PROGRESSION
  // ============================================
  { name: 'Wall Handstand', muscleGroups: ['front-delts', 'traps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'handstands', level: 1 }] },
  { name: 'Free Handstand', muscleGroups: ['front-delts', 'traps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'handstands', level: 4 }] },
  { name: 'One Arm Handstand', muscleGroups: ['front-delts', 'traps', 'upper-abs', 'obliques'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'handstands', level: 10 }] },

  // ============================================
  // RINGS HANDSTAND PROGRESSION
  // ============================================
  { name: 'Rings Shoulder Stand', muscleGroups: ['front-delts', 'traps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-handstand', level: 5 }] },
  { name: 'Rings Strap Handstand', muscleGroups: ['front-delts', 'traps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-handstand', level: 6 }] },
  { name: 'Rings Handstand', muscleGroups: ['front-delts', 'traps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-handstand', level: 7 }] },

  // ============================================
  // HANDSTAND PUSHUPS PROGRESSION
  // ============================================
  { name: 'Pike Headstand Pushup', muscleGroups: ['front-delts', 'triceps', 'upper-chest'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'hspu', level: 1 }] },
  { name: 'Wall Headstand Pushup Eccentric', muscleGroups: ['front-delts', 'triceps', 'upper-chest'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'hspu', level: 3 }] },
  { name: 'Wall Headstand Pushup', muscleGroups: ['front-delts', 'triceps', 'upper-chest'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'hspu', level: 4 }] },
  { name: 'Wall Handstand Pushup', muscleGroups: ['front-delts', 'triceps', 'upper-chest'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'hspu', level: 5 }] },
  { name: 'Free Headstand Pushup', muscleGroups: ['front-delts', 'triceps', 'upper-chest'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'hspu', level: 6 }] },
  { name: 'Free Handstand Pushup', muscleGroups: ['front-delts', 'triceps', 'upper-chest'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'hspu', level: 7 }] },

  // ============================================
  // RINGS HANDSTAND PUSHUPS PROGRESSION
  // ============================================
  { name: 'Rings Wide Handstand Pushup', muscleGroups: ['front-delts', 'triceps', 'upper-chest'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-hspu', level: 7 }] },
  { name: 'Rings Strap Handstand Pushup', muscleGroups: ['front-delts', 'triceps', 'upper-chest'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-hspu', level: 8 }] },
  { name: 'Rings Free Handstand Pushup', muscleGroups: ['front-delts', 'triceps', 'upper-chest'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-hspu', level: 9 }] },

  // ============================================
  // PRESS PROGRESSION (Overhead - BW ratios)
  // ============================================
  { name: 'Press 0.3x Bodyweight', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'press', level: 2 }] },
  { name: 'Press 0.43x Bodyweight', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'press', level: 3 }] },
  { name: 'Press 0.55x Bodyweight', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'press', level: 4 }] },
  { name: 'Press 0.68x Bodyweight', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'press', level: 5 }] },
  { name: 'Press 0.8x Bodyweight', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'press', level: 6 }] },
  { name: 'Press 0.9x Bodyweight', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'press', level: 7 }] },
  { name: 'Press 1x Bodyweight', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'press', level: 8 }] },
  { name: 'Press 1.08x Bodyweight', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'press', level: 9 }] },
  { name: 'Press 1.15x Bodyweight', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'press', level: 10 }] },
  { name: 'Press 1.2x Bodyweight', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'press', level: 11 }] },

  // ============================================
  // PRESS HANDSTANDS PROGRESSION
  // ============================================
  { name: 'Bent Arm Bent Body Press to Handstand', muscleGroups: ['front-delts', 'triceps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'press-handstand', level: 5 }] },
  { name: 'L-Sit Bent Arm Bent Body Press to Handstand', muscleGroups: ['front-delts', 'triceps', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'press-handstand', level: 6 }] },
  { name: 'Chest Roll Straight Body Press to Handstand', muscleGroups: ['front-delts', 'triceps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'press-handstand', level: 7 }] },
  { name: 'Bent Arm Straight Body Press to Handstand', muscleGroups: ['front-delts', 'triceps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'press-handstand', level: 8 }] },
  { name: 'Handstand to Elbow Lever to Handstand', muscleGroups: ['front-delts', 'triceps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'press-handstand', level: 9 }] },
  { name: 'Parallel Bars Dip Straight Body Press to Handstand', muscleGroups: ['front-delts', 'triceps', 'mid-chest', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'press-handstand', level: 10 }] },

  // ============================================
  // RINGS PRESS HANDSTAND PROGRESSION
  // ============================================
  { name: 'Rings Bent Arm Bent Body Press to Handstand', muscleGroups: ['front-delts', 'triceps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-press-handstand', level: 8 }] },
  { name: 'Rings Dip to Handstand', muscleGroups: ['front-delts', 'triceps', 'mid-chest', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-press-handstand', level: 9 }] },
  { name: 'Rings Bent Arm Straight Body Press to Handstand', muscleGroups: ['front-delts', 'triceps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-press-handstand', level: 10 }] },
  { name: 'Rings Handstand to Elbow Lever to Handstand', muscleGroups: ['front-delts', 'triceps', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-press-handstand', level: 11 }] },
  { name: 'Rings Dip Straight Body to Handstand', muscleGroups: ['front-delts', 'triceps', 'mid-chest', 'upper-abs'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-press-handstand', level: 12 }] },

  // ============================================
  // STRAIGHT ARM PRESS HANDSTAND PROGRESSION
  // ============================================
  { name: 'Wall Straddle Press to Handstand Eccentric', muscleGroups: ['front-delts', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'straight-arm-press-hs', level: 5 }] },
  { name: 'Elevated Straddle Stand, Straddle Press to Handstand', muscleGroups: ['front-delts', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'straight-arm-press-hs', level: 6 }] },
  { name: 'Straddle / Pike Stand Press to Handstand', muscleGroups: ['front-delts', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'straight-arm-press-hs', level: 7 }] },
  { name: 'L-Sit / Straddle-L Straddle Press to Handstand', muscleGroups: ['front-delts', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'straight-arm-press-hs', level: 8 }] },
  { name: 'L-Sit / Straddle-L Pike Press to Handstand', muscleGroups: ['front-delts', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'straight-arm-press-hs', level: 9 }] },
  { name: 'Rings Straight Arm L-Sit Straddle Press to Handstand', muscleGroups: ['front-delts', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'straight-arm-press-hs', level: 10 }] },
  { name: 'Rings Straight Arm Straddle-L Straddle Press to Handstand', muscleGroups: ['front-delts', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'straight-arm-press-hs', level: 11 }] },
  { name: 'Rings Straight Arm Pike Press to Handstand', muscleGroups: ['front-delts', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'straight-arm-press-hs', level: 12 }] },

  // ============================================
  // L-SIT, V-SIT, MANNA PROGRESSION
  // ============================================
  { name: 'Tuck L-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 1 }] },
  { name: '1 Leg Bent L-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 2 }] },
  { name: 'L-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 3 }] },
  { name: 'Straddle L-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 4 }] },
  // Rings Turned Out L-Sit — appears in BOTH l-sit AND rings-full-statics
  { name: 'Rings Turned Out L-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads', 'front-delts'], movementPattern: 'core', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 5 }, { progressionId: 'rings-full-statics', level: 5 }] },
  { name: '45 Degree V-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 6 }] },
  { name: '75 Degree V-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 7 }] },
  { name: '100 Degree V-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 8 }] },
  { name: '120 Degree V-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 9 }] },
  { name: '140 Degree V-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 10 }] },
  { name: '155 Degree V-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 11 }] },
  { name: '170 Degree V-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 12 }] },
  { name: 'Manna', muscleGroups: ['upper-abs', 'lower-abs', 'quads', 'front-delts'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'l-sit', level: 13 }] },

  // ============================================
  // BACK LEVER PROGRESSION
  // ============================================
  { name: 'German Hang', muscleGroups: ['front-delts', 'mid-chest', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'back-lever', level: 1 }] },
  { name: 'Skin the Cat', muscleGroups: ['front-delts', 'mid-chest', 'lats-upper', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'back-lever', level: 2 }] },
  { name: 'Tuck Back Lever', muscleGroups: ['front-delts', 'mid-chest', 'biceps', 'erector-spinae'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'back-lever', level: 3 }] },
  { name: 'Advanced Tuck Back Lever', muscleGroups: ['front-delts', 'mid-chest', 'biceps', 'erector-spinae'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'back-lever', level: 4 }] },
  { name: 'Straddle Back Lever', muscleGroups: ['front-delts', 'mid-chest', 'biceps', 'erector-spinae'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'back-lever', level: 5 }] },
  { name: 'Half Lay / 1 Leg Back Lever', muscleGroups: ['front-delts', 'mid-chest', 'biceps', 'erector-spinae'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'back-lever', level: 6 }] },
  { name: 'Full Back Lever', muscleGroups: ['front-delts', 'mid-chest', 'biceps', 'erector-spinae'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'back-lever', level: 7 }] },
  { name: 'Back Lever Pullout', muscleGroups: ['front-delts', 'mid-chest', 'biceps', 'lats-upper'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'back-lever', level: 8 }] },
  { name: 'German Hang Pullout', muscleGroups: ['front-delts', 'mid-chest', 'biceps', 'lats-upper'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'back-lever', level: 9 }] },
  { name: 'Barbell Pull-up to Back Lever', muscleGroups: ['front-delts', 'mid-chest', 'biceps', 'lats-upper', 'lats-lower'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'back-lever', level: 10 }] },
  { name: 'Handstand Lower to Back Lever', muscleGroups: ['front-delts', 'mid-chest', 'biceps', 'erector-spinae'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'back-lever', level: 11 }] },

  // ============================================
  // FRONT LEVER PROGRESSION
  // ============================================
  { name: 'Tuck Front Lever', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'lower-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'front-lever', level: 4 }] },
  { name: 'Advanced Tuck Front Lever', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'lower-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'front-lever', level: 5 }] },
  { name: 'Straddle Front Lever', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'lower-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'front-lever', level: 6 }] },
  { name: 'Half Lay / 1 Leg Front Lever', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'lower-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'front-lever', level: 7 }] },
  { name: 'Full Front Lever', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'lower-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'front-lever', level: 8 }] },
  { name: 'Front Lever to Inverted', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'lower-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'front-lever', level: 9 }] },
  { name: 'Hang Pull to Inverted', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'lower-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'front-lever', level: 10 }] },
  { name: 'Circle Front Lever', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'lower-abs', 'front-delts'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'front-lever', level: 11 }] },

  // ============================================
  // FRONT LEVER ROWS PROGRESSION
  // ============================================
  { name: 'Tuck Front Lever Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps', 'upper-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'front-lever-rows', level: 5 }] },
  { name: 'Advanced Tuck Front Lever Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps', 'upper-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'front-lever-rows', level: 6 }] },
  { name: 'Advanced Tuck Rope Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps', 'upper-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'front-lever-rows', level: 7 }] },
  { name: 'Straddle Front Lever Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps', 'upper-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'front-lever-rows', level: 8 }] },
  { name: 'Straddle Front Lever Rope Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps', 'upper-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'front-lever-rows', level: 9 }] },
  { name: 'Full Front Lever Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps', 'upper-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'front-lever-rows', level: 10 }] },
  { name: 'Full Front Lever Rope Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps', 'upper-abs'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'front-lever-rows', level: 11 }] },

  // ============================================
  // ROWS PROGRESSION
  // ============================================
  { name: 'Row Eccentric', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rows', level: 1 }] },
  { name: 'Ring Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rows', level: 2 }] },
  { name: 'Wide Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'rear-delts', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rows', level: 3 }] },
  { name: 'Archer Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rows', level: 4 }] },
  { name: 'Archer-in-Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rows', level: 5 }] },
  { name: 'Straight One Arm Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rows', level: 6 }] },
  { name: 'One Arm Rows', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rows', level: 7 }] },

  // ============================================
  // PULL-UPS PROGRESSION
  // ============================================
  { name: 'Jump Pull-ups', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pullups', level: 1 }] },
  { name: 'Bar Pull-up Eccentric', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pullups', level: 2 }] },
  { name: 'Bar Pull-ups', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pullups', level: 3 }] },
  { name: 'L-Pull-ups', muscleGroups: ['lats-upper', 'lats-lower', 'biceps', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pullups', level: 4 }] },
  { name: 'Pullover', muscleGroups: ['lats-upper', 'lats-lower', 'biceps', 'upper-abs'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pullups', level: 5 }] },

  // ============================================
  // RINGS PULL-UPS + ONE ARM CHIN PROGRESSION
  // ============================================
  { name: 'Rings L-Sit Pull-ups', muscleGroups: ['lats-upper', 'lats-lower', 'biceps', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-pullups-oac', level: 4 }] },
  { name: 'Rings Wide Pull-ups', muscleGroups: ['lats-upper', 'lats-lower', 'biceps', 'rear-delts'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-pullups-oac', level: 5 }] },
  { name: 'Rings Wide L-Sit Pull-ups', muscleGroups: ['lats-upper', 'lats-lower', 'biceps', 'upper-abs', 'lower-abs'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-pullups-oac', level: 6 }] },
  { name: 'Rings Archer Pull-ups', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-pullups-oac', level: 7 }] },
  { name: 'One Arm Chin Eccentric', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-pullups-oac', level: 8 }] },
  { name: 'One Arm Chin', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-pullups-oac', level: 9 }] },
  { name: 'One Arm Chin +15 lbs', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-pullups-oac', level: 10 }] },
  { name: 'One Arm Chin +25 lbs', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-pullups-oac', level: 11 }] },

  // ============================================
  // WEIGHTED PULL-UPS PROGRESSION (BW ratios)
  // ============================================
  { name: 'Assisted Pull-ups', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'weighted-pullups', level: 2 }] },
  { name: 'Weighted Pull-up 1x Bodyweight', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-pullups', level: 3 }] },
  { name: 'Weighted Pull-up 1.18x Bodyweight', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-pullups', level: 4 }] },
  { name: 'Weighted Pull-up 1.35x Bodyweight', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-pullups', level: 5 }] },
  { name: 'Weighted Pull-up 1.50x Bodyweight', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-pullups', level: 6 }] },
  { name: 'Weighted Pull-up 1.65x Bodyweight', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-pullups', level: 7 }] },
  { name: 'Weighted Pull-up 1.78x Bodyweight', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-pullups', level: 8 }] },
  { name: 'Weighted Pull-up 1.9x Bodyweight', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-pullups', level: 9 }] },
  { name: 'Weighted Pull-up 2x Bodyweight', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-pullups', level: 10 }] },
  { name: 'Weighted Pull-up 2.1x Bodyweight', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-pullups', level: 11 }] },

  // ============================================
  // IRON CROSS PROGRESSION
  // ============================================
  { name: 'Cross Progressions', muscleGroups: ['mid-chest', 'biceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'iron-cross', level: 9 }] },
  { name: 'Iron Cross Hold', muscleGroups: ['mid-chest', 'biceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'iron-cross', level: 10 }] },
  { name: 'Cross to Back Lever', muscleGroups: ['mid-chest', 'biceps', 'front-delts', 'erector-spinae'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'iron-cross', level: 11 }] },
  { name: 'Iron Cross Pullouts', muscleGroups: ['mid-chest', 'biceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'iron-cross', level: 13 }] },
  { name: 'Hang Pull to Back Lever', muscleGroups: ['mid-chest', 'biceps', 'front-delts', 'lats-upper'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'iron-cross', level: 14 }] },
  // Butterfly Mount — multi-progression: iron-cross + muscle-ups
  { name: 'Butterfly Mount', muscleGroups: ['mid-chest', 'biceps', 'front-delts', 'lats-upper', 'lats-lower'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'iron-cross', level: 15 }, { progressionId: 'muscle-ups', level: 15 }] },
  { name: 'Support to Hang to Cross', muscleGroups: ['mid-chest', 'biceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'iron-cross', level: 16 }] },

  // ============================================
  // PLANCHE (PARALLEL BARS/FLOOR) PROGRESSION
  // ============================================
  { name: 'Frog Stand', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'planche', level: 3 }] },
  { name: 'Straight Arm Frog Stand', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'planche', level: 4 }] },
  { name: 'Tuck Planche', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'planche', level: 5 }] },
  { name: 'Advanced Tuck Planche', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'planche', level: 6 }] },
  { name: 'Straddle Planche', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'planche', level: 8 }] },
  { name: 'Half Lay / 1 Leg Planche', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'planche', level: 9 }] },
  { name: 'Full Planche', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'planche', level: 11 }] },
  { name: 'Straight Arm Straddle Planche to Handstand', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'planche', level: 12 }] },
  { name: 'Straight Arm Planche to Handstand', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'planche', level: 14 }] },
  { name: 'Straight Arm Straight Body to Handstand', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'planche', level: 16 }] },

  // ============================================
  // RINGS PLANCHE PROGRESSION
  // ============================================
  { name: 'Rings Frog Stand', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-planche', level: 4 }] },
  { name: 'Rings Single Arm Frog Stand', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-planche', level: 5 }] },
  { name: 'Rings Tuck Planche', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-planche', level: 6 }] },
  { name: 'Rings Advanced Tuck Planche', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-planche', level: 8 }] },
  { name: 'Rings Straddle Planche', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-planche', level: 10 }] },
  { name: 'Rings Half Lay / 1 Leg Planche', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-planche', level: 12 }] },
  { name: 'Rings Full Planche', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-planche', level: 14 }] },

  // ============================================
  // PLANCHE PUSHUPS PROGRESSION
  // ============================================
  { name: 'Tuck Planche Pushup', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'planche-pushups', level: 6 }] },
  { name: 'Advanced Tuck Planche Pushup', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'planche-pushups', level: 8 }] },
  { name: 'Straddle Planche Pushup', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'planche-pushups', level: 10 }] },
  { name: 'Half Lay / 1 Leg Planche Pushup', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'planche-pushups', level: 12 }] },
  { name: 'Full Planche Pushup', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'planche-pushups', level: 14 }] },

  // ============================================
  // RINGS PLANCHE PUSHUPS PROGRESSION
  // ============================================
  { name: 'Rings Tuck Planche Pushup', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-planche-pushups', level: 8 }] },
  { name: 'Rings Advanced Tuck Planche Pushup', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-planche-pushups', level: 10 }] },
  { name: 'Rings Straddle Planche Pushup', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-planche-pushups', level: 12 }] },
  { name: 'Rings Half Lay / 1 Leg Planche Pushup', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-planche-pushups', level: 14 }] },
  { name: 'Rings Planche Pushup', muscleGroups: ['front-delts', 'upper-chest', 'triceps', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-planche-pushups', level: 16 }] },

  // ============================================
  // PUSHUPS PROGRESSION
  // ============================================
  { name: 'Regular Pushups', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 1 }] },
  { name: 'Diamond Pushups', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 2 }] },
  { name: 'Rings Wide Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 3 }] },
  { name: 'Rings Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 4 }] },
  { name: 'Rings Turned Out Pushups', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 5 }] },
  { name: 'Rings Turned Out Archer Pushups', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 6 }] },
  { name: 'Rings Turned Out 40 Degree Pseudo Planche Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts', 'upper-chest'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 7 }] },
  { name: 'Rings Turned Out 60 Degree Pseudo Planche Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts', 'upper-chest'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 8 }] },
  { name: 'Rings Turned Out Maltese Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts', 'upper-chest'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 9 }] },
  { name: 'Wall Pseudo Planche Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts', 'upper-chest'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 10 }] },
  { name: 'Rings Wall Pseudo Planche Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts', 'upper-chest'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 11 }] },
  { name: 'Wall Maltese Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts', 'upper-chest'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 12 }] },
  { name: 'Rings Wall Maltese Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts', 'upper-chest'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'pushups', level: 13 }] },

  // ============================================
  // ONE ARM PUSHUPS PROGRESSION
  // ============================================
  { name: 'Elevated One Arm Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'one-arm-pushups', level: 5 }] },
  { name: 'Straddle One Arm Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'one-arm-pushups', level: 6 }] },
  { name: 'Rings Straight One Arm Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'one-arm-pushups', level: 7 }] },
  { name: 'Straight Body One Arm Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'one-arm-pushups', level: 8 }] },
  { name: 'Rings Straight Body One Arm Pushup', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'one-arm-pushups', level: 9 }] },

  // ============================================
  // DIPS / ONE ARM DIPS PROGRESSION
  // ============================================
  { name: 'Parallel Bars Jump Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dips', level: 1 }] },
  { name: 'Parallel Bars Dips Eccentric', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dips', level: 2 }] },
  { name: 'Parallel Bars Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dips', level: 3 }] },
  { name: 'L-Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts', 'upper-abs'], movementPattern: 'dip', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dips', level: 4 }] },
  { name: '45 Degree Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dips', level: 5 }] },
  { name: 'Wall Bent Body One Arm Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dips', level: 6 }] },
  { name: 'Side Bent Body One Arm Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dips', level: 7 }] },
  { name: 'Wall Straight Body One Arm Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dips', level: 8 }] },
  { name: 'Side Straight Body One Arm Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dips', level: 9 }] },

  // ============================================
  // RING DIPS PROGRESSION
  // ============================================
  { name: 'Support Hold', muscleGroups: ['triceps', 'front-delts', 'upper-abs'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'ring-dips', level: 1 }] },
  { name: 'Rings Turned Out Support', muscleGroups: ['triceps', 'front-delts', 'upper-abs'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'ring-dips', level: 2 }] },
  { name: 'Rings Dips Eccentric', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 3 }] },
  { name: 'Rings Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 4 }] },
  { name: 'Rings L-Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts', 'upper-abs'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 5 }] },
  { name: 'Rings Wide Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 6 }] },
  { name: 'Rings Turned Out 45 Degree Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 7 }] },
  { name: 'Rings Turned Out 75 Degree Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 8 }] },
  { name: 'Rings Turned Out 90 Degree Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 9 }] },
  { name: 'Rings Turned Out 90 Degree + 50 Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 10 }] },
  { name: 'Rings Turned Out 90 Degree + 65 Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 11 }] },
  { name: 'Rings Turned Out 90 Degree + 75 Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 12 }] },
  { name: 'Rings Turned Out 90 Degree + 82 Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 13 }] },
  { name: 'Rings Turned Out 90 Degree + 86 Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 14 }] },
  { name: 'Rings Turned Out 90 Degree + 88 Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ring-dips', level: 15 }] },
  { name: 'Maltese', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts', 'biceps'], movementPattern: 'dip', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'ring-dips', level: 17 }] },

  // ============================================
  // WEIGHTED DIPS PROGRESSION (BW ratios)
  // ============================================
  { name: 'Assisted Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'weighted-dips', level: 2 }] },
  { name: 'Dips', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'weighted-dips', level: 3 }] },
  { name: 'Weighted Dip 1.2x Bodyweight', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-dips', level: 4 }] },
  { name: 'Weighted Dip 1.38x Bodyweight', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-dips', level: 5 }] },
  { name: 'Weighted Dip 1.55x Bodyweight', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-dips', level: 6 }] },
  { name: 'Weighted Dip 1.7x Bodyweight', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-dips', level: 7 }] },
  { name: 'Weighted Dip 1.85x Bodyweight', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-dips', level: 8 }] },
  { name: 'Weighted Dip 2x Bodyweight', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-dips', level: 9 }] },
  { name: 'Weighted Dip 2.13x Bodyweight', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-dips', level: 10 }] },
  { name: 'Weighted Dip 2.25x Bodyweight', muscleGroups: ['mid-chest', 'lower-chest', 'triceps', 'front-delts'], movementPattern: 'dip', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'weighted-dips', level: 11 }] },

  // ============================================
  // MUSCLE-UPS / INVERTED MUSCLE-UPS PROGRESSION
  // ============================================
  { name: 'Muscle-up Negatives', muscleGroups: ['lats-upper', 'lats-lower', 'mid-chest', 'triceps', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 3 }] },
  { name: 'Kipping Muscle-up', muscleGroups: ['lats-upper', 'lats-lower', 'mid-chest', 'triceps', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 4 }] },
  { name: 'Muscle-ups', muscleGroups: ['lats-upper', 'lats-lower', 'mid-chest', 'triceps', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 5 }] },
  { name: 'Wide / No False Grip Muscle-ups', muscleGroups: ['lats-upper', 'lats-lower', 'mid-chest', 'triceps', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 6 }] },
  { name: 'Strict Bar Muscle-up', muscleGroups: ['lats-upper', 'lats-lower', 'mid-chest', 'triceps', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 7 }] },
  { name: 'Straddle Front Lever to Muscle Up to Advanced Tuck Planche', muscleGroups: ['lats-upper', 'lats-lower', 'mid-chest', 'triceps', 'biceps', 'front-delts'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 8 }] },
  { name: 'One Arm Straight Muscle-up', muscleGroups: ['lats-upper', 'lats-lower', 'mid-chest', 'triceps', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 9 }] },
  // Felge Backward Straight Body to Support — multi-progression: muscle-ups + rings-felge
  { name: 'Felge Backward Straight Body to Support', muscleGroups: ['lats-upper', 'lats-lower', 'front-delts', 'upper-abs'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 10 }, { progressionId: 'rings-felge', level: 10 }] },
  { name: 'Front Lever Muscle Up Straddle Planche', muscleGroups: ['lats-upper', 'lats-lower', 'mid-chest', 'triceps', 'biceps', 'front-delts'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 11 }] },
  // Felge Backward Straight Body to Handstand — multi-progression: muscle-ups + rings-felge
  { name: 'Felge Backward Straight Body to Handstand', muscleGroups: ['lats-upper', 'lats-lower', 'front-delts', 'upper-abs', 'triceps'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 12 }, { progressionId: 'rings-felge', level: 12 }] },
  { name: 'Straight Body Rotation to Handstand', muscleGroups: ['lats-upper', 'lats-lower', 'front-delts', 'upper-abs'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 14 }] },
  // Butterfly Mount already defined in iron-cross with multi-membership
  { name: 'Elevator', muscleGroups: ['lats-upper', 'lats-lower', 'mid-chest', 'triceps', 'biceps', 'front-delts'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'muscle-ups', level: 17 }] },

  // ============================================
  // ELBOW LEVERS PROGRESSION
  // ============================================
  { name: 'Two-Arm Elbow Lever', muscleGroups: ['front-delts', 'obliques', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'elbow-levers', level: 5 }] },
  { name: 'Rings Two-Arm Elbow Lever', muscleGroups: ['front-delts', 'obliques', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'elbow-levers', level: 6 }] },
  { name: 'One Arm Straddle Elbow Lever', muscleGroups: ['front-delts', 'obliques', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'elbow-levers', level: 7 }] },
  { name: 'One Arm Straight Body Elbow Lever', muscleGroups: ['front-delts', 'obliques', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'elbow-levers', level: 8 }] },

  // ============================================
  // FLAG PROGRESSION
  // ============================================
  { name: 'Tuck Flag', muscleGroups: ['obliques', 'lats-upper', 'front-delts'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'flag', level: 5 }] },
  { name: 'Advanced Tuck Flag', muscleGroups: ['obliques', 'lats-upper', 'front-delts'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'flag', level: 6 }] },
  { name: 'Straddle Flag', muscleGroups: ['obliques', 'lats-upper', 'front-delts'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'flag', level: 7 }] },
  { name: 'Full Flag', muscleGroups: ['obliques', 'lats-upper', 'front-delts'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'flag', level: 8 }] },

  // ============================================
  // AB WHEEL PROGRESSION
  // ============================================
  { name: '1 Arm 1 Leg Plank', muscleGroups: ['upper-abs', 'lower-abs', 'obliques'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'ab-wheel', level: 4 }] },
  { name: 'Knees Ab Wheel', muscleGroups: ['upper-abs', 'lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ab-wheel', level: 5 }] },
  { name: 'Ab Wheel Ramp', muscleGroups: ['upper-abs', 'lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ab-wheel', level: 6 }] },
  { name: 'Ab Wheel Eccentric', muscleGroups: ['upper-abs', 'lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ab-wheel', level: 7 }] },
  { name: 'Full Ab Wheel', muscleGroups: ['upper-abs', 'lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ab-wheel', level: 8 }] },
  { name: 'Ab Wheel + 20 lbs', muscleGroups: ['upper-abs', 'lower-abs'], movementPattern: 'core', equipment: 'barbell', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ab-wheel', level: 9 }] },
  { name: 'One Arm Ab Wheel', muscleGroups: ['upper-abs', 'lower-abs', 'obliques'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'ab-wheel', level: 10 }] },

  // ============================================
  // RINGS FULL STATICS PROGRESSION
  // (Rings Turned Out L-Sit already defined in L-sit with multi-membership)
  // ============================================
  { name: 'Rings Turned Out Straight-L', muscleGroups: ['upper-abs', 'lower-abs', 'quads', 'front-delts'], movementPattern: 'core', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-full-statics', level: 6 }] },
  { name: 'Rings Back Lever', muscleGroups: ['front-delts', 'mid-chest', 'biceps', 'erector-spinae'], movementPattern: 'horizontal-pull', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-full-statics', level: 7 }] },
  { name: 'Rings Front Lever', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'lower-abs'], movementPattern: 'horizontal-pull', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-full-statics', level: 8 }] },
  { name: 'Rings 90 Degree V-Sit', muscleGroups: ['upper-abs', 'lower-abs', 'quads', 'front-delts'], movementPattern: 'core', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-full-statics', level: 9 }] },
  { name: 'Iron Cross / Straight Planche', muscleGroups: ['mid-chest', 'biceps', 'front-delts', 'upper-chest', 'triceps'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-full-statics', level: 10 }] },

  // ============================================
  // RINGS KIP SKILLS PROGRESSION
  // ============================================
  { name: 'Kip to Support', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'front-delts'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-kip', level: 6 }] },
  { name: 'Back Kip to Support', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'front-delts'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-kip', level: 7 }] },
  { name: 'Single Arm Back Kip to Support', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'obliques', 'front-delts'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-kip', level: 10 }] },
  { name: 'Back Kip to Handstand', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'front-delts', 'triceps'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-kip', level: 11 }] },
  { name: 'Single Arm Kip to V-Sit/Cross/L-Cross', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'obliques', 'front-delts', 'biceps'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-kip', level: 13 }] },
  { name: 'Back Kip to Cross/L-Cross', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'front-delts', 'biceps', 'mid-chest'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-kip', level: 14 }] },
  { name: 'Back Kip to Straddle Planche', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'front-delts', 'upper-chest', 'triceps'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-kip', level: 15 }] },
  { name: 'Inverted Cross', muscleGroups: ['mid-chest', 'biceps', 'front-delts', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'rings', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'rings-kip', level: 16 }] },

  // ============================================
  // RINGS FELGE SKILLS PROGRESSION
  // ============================================
  { name: 'Felge Forward Tuck to Support', muscleGroups: ['lats-upper', 'lats-lower', 'front-delts', 'upper-abs'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-felge', level: 5 }] },
  { name: 'Felge Forward Pike / Felge Backward Tuck', muscleGroups: ['lats-upper', 'lats-lower', 'front-delts', 'upper-abs'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-felge', level: 6 }] },
  { name: 'Felge Backward Pike to Support', muscleGroups: ['lats-upper', 'lats-lower', 'front-delts', 'upper-abs'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-felge', level: 7 }] },
  { name: 'Felge Forward Straight to Support', muscleGroups: ['lats-upper', 'lats-lower', 'front-delts', 'upper-abs'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-felge', level: 10 }] },
  // Felge Backward Straight Body to Support and Felge Backward Straight Body to Handstand already defined in muscle-ups with multi-membership
  { name: 'Felge Backward Straight to Support', muscleGroups: ['lats-upper', 'lats-lower', 'front-delts', 'upper-abs'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-felge', level: 11 }] },
  { name: 'Felge Forward Single Arm to Cross', muscleGroups: ['lats-upper', 'lats-lower', 'front-delts', 'upper-abs', 'biceps', 'mid-chest'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-felge', level: 13 }] },
  { name: 'Felge Forward Single Arm to Straight Planche', muscleGroups: ['lats-upper', 'lats-lower', 'front-delts', 'upper-abs', 'upper-chest', 'triceps'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-felge', level: 14 }] },
  { name: 'Felge Forward Single Arm Straight Body to Handstand', muscleGroups: ['lats-upper', 'lats-lower', 'front-delts', 'upper-abs', 'triceps'], movementPattern: 'vertical-pull', equipment: 'rings', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'rings-felge', level: 15 }] },

  // ============================================
  // SQUATS PROGRESSION
  // ============================================
  { name: 'Parallel Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'squats', level: 1 }] },
  { name: 'Full Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'squats', level: 2 }] },
  { name: 'Side to Side Squat', muscleGroups: ['quads', 'glutes', 'adductors'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'squats', level: 3 }] },
  { name: 'Pistol', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'squats', level: 4 }] },
  { name: 'Pistol 1.2x Bodyweight', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'squats', level: 5 }] },
  { name: 'Pistol 1.35x Bodyweight', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'squats', level: 6 }] },
  { name: 'Pistol 1.5x Bodyweight', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'squats', level: 7 }] },
  { name: 'Pistol 1.65x Bodyweight', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'squats', level: 8 }] },
  { name: 'Pistol 1.8x Bodyweight', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'squats', level: 9 }] },
  { name: 'Pistol 1.9x Bodyweight', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'squats', level: 10 }] },
  { name: 'Pistol 2x Bodyweight', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'squats', level: 11 }] },

  // ============================================
  // GLUTE BRIDGE / HIP THRUSTS PROGRESSION
  // ============================================
  { name: 'Glute Bridge', muscleGroups: ['glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'glute-bridge', level: 1 }] },
  { name: 'Elevated Shoulder Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'glute-bridge', level: 2 }] },
  { name: '1 Leg Glute Bridge', muscleGroups: ['glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'glute-bridge', level: 3 }] },
  { name: 'Elevated Shoulder 1 Leg Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'glute-bridge', level: 4 }] },
  { name: 'Weighted Hip Thrusts', muscleGroups: ['glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'glute-bridge', level: 5 }] },

  // ============================================
  // NATURAL HAMSTRING CURL / NORDIC CURL PROGRESSION
  // ============================================
  { name: '2 Leg Hamstring Slide', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'nordic-curl', level: 1 }] },
  { name: '1 Leg Hamstring Slide Eccentric', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'nordic-curl', level: 2 }] },
  { name: '1 Leg Hamstring Slide', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'nordic-curl', level: 3 }] },
  { name: 'Hip Hinge with Vertical Thighs', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'nordic-curl', level: 4 }] },
  { name: 'Slow Eccentric to the Ground', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'nordic-curl', level: 5 }] },
  { name: 'Full Natural Hamstring Curl', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'nordic-curl', level: 6 }] },
  { name: 'Hamstring Curl with Arms Overhead', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'nordic-curl', level: 7 }] },
  { name: 'Weighted Hamstring Curl', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'horizontal-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'nordic-curl', level: 8 }] },

  // ============================================
  // SHRIMP SQUAT PROGRESSION
  // ============================================
  { name: 'Lunges', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'shrimp-squat', level: 1 }] },
  { name: 'Split Squat (Chair)', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'shrimp-squat', level: 2 }] },
  { name: 'Beginner Shrimp', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'shrimp-squat', level: 3 }] },
  { name: 'Intermediate Shrimp', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'shrimp-squat', level: 4 }] },
  { name: 'Advanced Shrimp', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'shrimp-squat', level: 5 }] },
  { name: 'Elevated / Deficit Advanced Shrimp', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'shrimp-squat', level: 6 }] },
  { name: 'Elevated / Deficit 2 Hand Shrimp', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'shrimp-squat', level: 8 }] },
  { name: 'Weighted Elevated Intermediate Shrimp', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'shrimp-squat', level: 9 }] },

  // ============================================
  // REVERSE HYPEREXTENSIONS PROGRESSION
  // ============================================
  { name: 'Full Tuck Reverse Hyperextensions', muscleGroups: ['erector-spinae', 'glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'reverse-hyper', level: 1 }] },
  { name: '90 Degree Bent Knee Reverse Hyperextensions', muscleGroups: ['erector-spinae', 'glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'reverse-hyper', level: 2 }] },
  { name: 'Full Reverse Hyperextensions', muscleGroups: ['erector-spinae', 'glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'reverse-hyper', level: 3 }] },
  { name: 'Weighted Reverse Hyperextensions', muscleGroups: ['erector-spinae', 'glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'reverse-hyper', level: 4 }] },

  // ============================================
  // HANGING LEG RAISES PROGRESSION
  // ============================================
  // Floor Tuck Raises — multi-progression: hanging-leg-raises + dragon-flag
  { name: 'Floor Tuck Raises', muscleGroups: ['lower-abs', 'upper-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'hanging-leg-raises', level: 1 }, { progressionId: 'dragon-flag', level: 1 }] },
  // Floor Leg Raises — multi-progression: hanging-leg-raises + dragon-flag
  { name: 'Floor Leg Raises / Floor Straight Leg Raises', muscleGroups: ['lower-abs', 'upper-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'hanging-leg-raises', level: 2 }, { progressionId: 'dragon-flag', level: 2 }] },
  { name: 'Hang Bent Leg Toes to Bar', muscleGroups: ['lower-abs', 'upper-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'hanging-leg-raises', level: 3 }] },
  { name: 'Hang Straight Leg Toes to Bar', muscleGroups: ['lower-abs', 'upper-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'hanging-leg-raises', level: 4 }] },
  { name: 'Windshield Wipers / 360 Hanging Leg Raises', muscleGroups: ['lower-abs', 'upper-abs', 'obliques'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'hanging-leg-raises', level: 5 }] },
  { name: 'Ankle Weight Toes to Bar', muscleGroups: ['lower-abs', 'upper-abs'], movementPattern: 'core', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'hanging-leg-raises', level: 6 }] },

  // ============================================
  // DRAGON FLAG PROGRESSION
  // (Floor Tuck Raises and Floor Leg Raises already defined with multi-membership)
  // ============================================
  { name: 'Tuck Eccentric Dragon Flag', muscleGroups: ['upper-abs', 'lower-abs', 'erector-spinae'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dragon-flag', level: 3 }] },
  { name: 'Advanced Tuck Dragon Flag', muscleGroups: ['upper-abs', 'lower-abs', 'erector-spinae'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dragon-flag', level: 4 }] },
  { name: 'One Leg / Straddle Dragon Flag', muscleGroups: ['upper-abs', 'lower-abs', 'erector-spinae'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dragon-flag', level: 5 }] },
  { name: 'Full Dragon Flag', muscleGroups: ['upper-abs', 'lower-abs', 'erector-spinae'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'], progressionMemberships: [{ progressionId: 'dragon-flag', level: 6 }] },
  { name: 'Weighted Dragon Flag', muscleGroups: ['upper-abs', 'lower-abs', 'erector-spinae'], movementPattern: 'core', equipment: 'barbell', defaultFields: ['weight', 'reps'], progressionMemberships: [{ progressionId: 'dragon-flag', level: 7 }] },

  // ============================================
  // ONE ARM STATICS PROGRESSION
  // ============================================
  { name: 'One Arm Back Lever', muscleGroups: ['front-delts', 'mid-chest', 'biceps', 'erector-spinae', 'obliques'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'one-arm-statics', level: 8 }] },
  { name: 'One Arm Front Lever', muscleGroups: ['lats-upper', 'lats-lower', 'upper-abs', 'lower-abs', 'obliques'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['time'], progressionMemberships: [{ progressionId: 'one-arm-statics', level: 12 }] },
];
