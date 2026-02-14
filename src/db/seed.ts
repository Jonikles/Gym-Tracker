import { db } from './index';
import type { Exercise, Setting, MuscleGroup, ExerciseField } from '../types';

/**
 * Helper type for exercise definition
 */
interface ExerciseDefinition {
  name: string;
  muscleGroups: MuscleGroup[];
  movementPattern: string;
  equipment: string;
  defaultFields: ExerciseField[];
  progressionLevel?: number;
}

/**
 * Preset exercise library - v1.1 with updated muscle groups
 * All exercises use the new specific muscle group keys
 */
const presetExercises: ExerciseDefinition[] = [
  // ============================================
  // CHEST - Barbell
  // ============================================
  { name: 'Barbell Bench Press', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Incline Barbell Bench Press', muscleGroups: ['upper-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Decline Barbell Bench Press', muscleGroups: ['lower-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Close-Grip Bench Press', muscleGroups: ['triceps', 'mid-chest'], movementPattern: 'horizontal-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  
  // CHEST - Dumbbell
  { name: 'Dumbbell Bench Press', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Incline Dumbbell Bench Press', muscleGroups: ['upper-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Decline Dumbbell Bench Press', muscleGroups: ['lower-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Fly', muscleGroups: ['mid-chest'], movementPattern: 'horizontal-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Incline Dumbbell Fly', muscleGroups: ['upper-chest'], movementPattern: 'horizontal-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Pullover', muscleGroups: ['mid-chest', 'lats-upper', 'lats-lower'], movementPattern: 'horizontal-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  
  // CHEST - Cable
  { name: 'Cable Fly', muscleGroups: ['mid-chest'], movementPattern: 'horizontal-push', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'High Cable Fly', muscleGroups: ['lower-chest'], movementPattern: 'horizontal-push', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Low Cable Fly', muscleGroups: ['upper-chest'], movementPattern: 'horizontal-push', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Crossover', muscleGroups: ['mid-chest'], movementPattern: 'horizontal-push', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  
  // CHEST - Machine
  { name: 'Machine Chest Press', muscleGroups: ['mid-chest', 'triceps'], movementPattern: 'horizontal-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Incline Machine Press', muscleGroups: ['upper-chest', 'triceps'], movementPattern: 'horizontal-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Pec Deck', muscleGroups: ['mid-chest'], movementPattern: 'horizontal-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  
  // ============================================
  // BACK - Barbell
  // ============================================
  { name: 'Barbell Row', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Pendlay Row', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'T-Bar Row', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Barbell Shrug', muscleGroups: ['traps'], movementPattern: 'horizontal-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Deadlift', muscleGroups: ['erector-spinae', 'glutes', 'hamstrings', 'traps'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Sumo Deadlift', muscleGroups: ['erector-spinae', 'glutes', 'quads', 'adductors'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes', 'erector-spinae'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Stiff-Leg Deadlift', muscleGroups: ['hamstrings', 'glutes', 'erector-spinae'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Rack Pull', muscleGroups: ['erector-spinae', 'traps', 'glutes'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  
  // BACK - Dumbbell
  { name: 'Dumbbell Row', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Shrug', muscleGroups: ['traps'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes', 'erector-spinae'], movementPattern: 'hinge', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Chest-Supported Dumbbell Row', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Seal Row', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  
  // BACK - Cable
  { name: 'Lat Pulldown', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Wide-Grip Lat Pulldown', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Close-Grip Lat Pulldown', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Neutral-Grip Lat Pulldown', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Seated Cable Row', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Single-Arm Cable Row', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Face Pull', muscleGroups: ['rear-delts', 'traps', 'rhomboids'], movementPattern: 'horizontal-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Straight-Arm Pulldown', muscleGroups: ['lats-upper', 'lats-lower'], movementPattern: 'horizontal-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Shrug', muscleGroups: ['traps'], movementPattern: 'vertical-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  
  // BACK - Machine
  { name: 'Machine Row', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Machine Lat Pulldown', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Machine Shrug', muscleGroups: ['traps'], movementPattern: 'vertical-pull', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  
  // BACK - Bodyweight
  { name: 'Neutral-Grip Pull-Up', muscleGroups: ['lats-upper', 'lats-lower', 'biceps', 'brachioradialis'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Inverted Row', muscleGroups: ['lats-upper', 'lats-lower', 'rhomboids', 'biceps'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'] },
  
  // ============================================
  // SHOULDERS - Barbell
  // ============================================
  { name: 'Overhead Press', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Push Press', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Behind-the-Neck Press', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Barbell Upright Row', muscleGroups: ['side-delts', 'traps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Barbell Front Raise', muscleGroups: ['front-delts'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  
  // SHOULDERS - Dumbbell
  { name: 'Dumbbell Shoulder Press', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Seated Dumbbell Press', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Arnold Press', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Lateral Raise', muscleGroups: ['side-delts'], movementPattern: 'vertical-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Front Raise', muscleGroups: ['front-delts'], movementPattern: 'vertical-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Rear Delt Fly', muscleGroups: ['rear-delts'], movementPattern: 'horizontal-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Upright Row', muscleGroups: ['side-delts', 'traps'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Lu Raise', muscleGroups: ['side-delts', 'front-delts'], movementPattern: 'vertical-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  
  // SHOULDERS - Cable
  { name: 'Cable Lateral Raise', muscleGroups: ['side-delts'], movementPattern: 'vertical-push', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Front Raise', muscleGroups: ['front-delts'], movementPattern: 'vertical-push', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Rear Delt Fly', muscleGroups: ['rear-delts'], movementPattern: 'horizontal-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Upright Row', muscleGroups: ['side-delts', 'traps'], movementPattern: 'vertical-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  
  // SHOULDERS - Machine
  { name: 'Machine Shoulder Press', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Machine Lateral Raise', muscleGroups: ['side-delts'], movementPattern: 'vertical-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Reverse Pec Deck', muscleGroups: ['rear-delts'], movementPattern: 'horizontal-pull', equipment: 'machine', defaultFields: ['weight', 'reps'] },

  // ============================================
  // BICEPS
  // ============================================
  { name: 'Barbell Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'EZ-Bar Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Preacher Curl (Barbell)', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Drag Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Reverse Curl (Barbell)', muscleGroups: ['brachioradialis', 'forearms', 'biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Hammer Curl', muscleGroups: ['biceps', 'brachioradialis', 'forearms'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Incline Dumbbell Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Concentration Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Preacher Curl (Dumbbell)', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Spider Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Cross-Body Hammer Curl', muscleGroups: ['biceps', 'brachioradialis', 'forearms'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Hammer Curl', muscleGroups: ['biceps', 'brachioradialis', 'forearms'], movementPattern: 'vertical-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Overhead Cable Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Bayesian Cable Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Machine Preacher Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Machine Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  
  // ============================================
  // TRICEPS
  // ============================================
  { name: 'Skull Crusher', muscleGroups: ['triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'JM Press', muscleGroups: ['triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Skull Crusher', muscleGroups: ['triceps'], movementPattern: 'vertical-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Overhead Tricep Extension', muscleGroups: ['triceps'], movementPattern: 'vertical-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Kickback', muscleGroups: ['triceps'], movementPattern: 'horizontal-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Tricep Pushdown', muscleGroups: ['triceps'], movementPattern: 'vertical-push', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Rope Pushdown', muscleGroups: ['triceps'], movementPattern: 'vertical-push', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Single-Arm Cable Pushdown', muscleGroups: ['triceps'], movementPattern: 'vertcal-push', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Machine Tricep Extension', muscleGroups: ['triceps'], movementPattern: 'vertical-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Machine Dip', muscleGroups: ['triceps', 'lower-chest'], movementPattern: 'dip', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  
  // ============================================
  // QUADS
  // ============================================
  { name: 'Barbell Back Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Barbell Front Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Pause Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Box Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Zercher Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Barbell Lunge', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Walking Lunge (Barbell)', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Goblet Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Lunge', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Bulgarian Split Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Step-Up', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Walking Lunge (Dumbbell)', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Reverse Lunge (Dumbbell)', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Leg Press', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Hack Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Pendulum Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Leg Extension', muscleGroups: ['quads'], movementPattern: 'squat', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Smith Machine Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Belt Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Jump Squat', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'] },
  
  // ============================================
  // HAMSTRINGS
  // ============================================
  { name: 'Good Morning', muscleGroups: ['hamstrings', 'glutes', 'erector-spinae'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Good Morning', muscleGroups: ['hamstrings', 'glutes', 'erector-spinae'], movementPattern: 'hinge', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Single-Leg Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'hinge', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Pull-Through', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'hinge', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Lying Leg Curl', muscleGroups: ['hamstrings'], movementPattern: 'horizontal-pull', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Seated Leg Curl', muscleGroups: ['hamstrings'], movementPattern: 'horizontal-pull', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Standing Leg Curl', muscleGroups: ['hamstrings'], movementPattern: 'horizontal-pull', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Nordic Curl', muscleGroups: ['hamstrings'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Glute-Ham Raise', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'horizontal-pull', equipment: 'bodyweight', defaultFields: ['reps'] },
  
  // ============================================
  // GLUTES
  // ============================================
  { name: 'Barbell Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Barbell Glute Bridge', muscleGroups: ['glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Kickback', muscleGroups: ['glutes'], movementPattern: 'hinge', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Hip Thrust Machine', muscleGroups: ['glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Glute Kickback Machine', muscleGroups: ['glutes'], movementPattern: 'hinge', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Frog Pump', muscleGroups: ['glutes'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Clamshell', muscleGroups: ['glutes', 'abductors'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'] },
  
  // ============================================
  // ADDUCTORS
  // ============================================
  { name: 'Hip Adduction Machine', muscleGroups: ['adductors'], movementPattern: 'hinge', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Hip Adduction', muscleGroups: ['adductors'], movementPattern: 'hinge', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Copenhagen Plank', muscleGroups: ['adductors', 'obliques'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'] },
  { name: 'Copenhagen Plank (Dynamic)', muscleGroups: ['adductors', 'obliques'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Lying Adductor Squeeze', muscleGroups: ['adductors'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Side-Lying Adduction', muscleGroups: ['adductors'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Sumo Goblet Squat', muscleGroups: ['adductors', 'quads', 'glutes'], movementPattern: 'squat', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  
  // ============================================
  // ABDUCTORS
  // ============================================
  { name: 'Hip Abduction Machine', muscleGroups: ['abductors', 'glutes'], movementPattern: 'hinge', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Hip Abduction', muscleGroups: ['abductors', 'glutes'], movementPattern: 'hinge', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Banded Lateral Walk', muscleGroups: ['abductors', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Banded Clamshell', muscleGroups: ['abductors', 'glutes'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Side-Lying Hip Abduction', muscleGroups: ['abductors', 'glutes'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Fire Hydrant', muscleGroups: ['abductors', 'glutes'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Standing Hip Abduction', muscleGroups: ['abductors', 'glutes'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Banded Monster Walk', muscleGroups: ['abductors', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'] },
  
  // ============================================
  // CALVES
  // ============================================
  { name: 'Standing Calf Raise (Machine)', muscleGroups: ['calves'], movementPattern: 'vertical-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Seated Calf Raise', muscleGroups: ['calves'], movementPattern: 'vertical-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Leg Press Calf Raise', muscleGroups: ['calves'], movementPattern: 'vertical-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Dumbbell Calf Raise', muscleGroups: ['calves'], movementPattern: 'vertical-push', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Barbell Calf Raise', muscleGroups: ['calves'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Single-Leg Calf Raise (Bodyweight)', muscleGroups: ['calves'], movementPattern: 'vertical-push', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Donkey Calf Raise', muscleGroups: ['calves'], movementPattern: 'vertical-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  
  // ============================================
  // FOREARMS / BRACHIORADIALIS
  // ============================================
  { name: 'Wrist Curl (Barbell)', muscleGroups: ['forearms'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Reverse Wrist Curl (Barbell)', muscleGroups: ['forearms'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Wrist Curl (Dumbbell)', muscleGroups: ['forearms'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Farmers Walk', muscleGroups: ['forearms', 'traps'], movementPattern: 'carry', equipment: 'dumbbell', defaultFields: ['weight', 'distance'] },
  { name: 'Dead Hang', muscleGroups: ['forearms'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'] },
  { name: 'Plate Pinch', muscleGroups: ['forearms'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'time'] },
  { name: 'Reverse Curl (Dumbbell)', muscleGroups: ['brachioradialis', 'forearms'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Reverse Curl (Cable)', muscleGroups: ['brachioradialis', 'forearms'], movementPattern: 'vertical-pull', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Zottman Curl', muscleGroups: ['biceps', 'brachioradialis', 'forearms'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  { name: 'Pronated Dumbbell Curl', muscleGroups: ['brachioradialis', 'forearms'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
  
  // ============================================
  // ABS / CORE
  // ============================================
  { name: 'Crunch', muscleGroups: ['upper-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Sit-Up', muscleGroups: ['upper-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Leg Raise', muscleGroups: ['lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Hanging Knee Raise', muscleGroups: ['lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Plank', muscleGroups: ['upper-abs', 'lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'] },
  { name: 'Side Plank', muscleGroups: ['obliques'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['time'] },
  { name: 'Russian Twist', muscleGroups: ['obliques'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Cable Crunch', muscleGroups: ['upper-abs'], movementPattern: 'core', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Cable Woodchop', muscleGroups: ['obliques'], movementPattern: 'core', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Ab Wheel Rollout', muscleGroups: ['upper-abs', 'lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Dead Bug', muscleGroups: ['upper-abs', 'lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Bird Dog', muscleGroups: ['upper-abs', 'lower-abs', 'erector-spinae'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Mountain Climber', muscleGroups: ['lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Bicycle Crunch', muscleGroups: ['upper-abs', 'obliques'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'V-Up', muscleGroups: ['upper-abs', 'lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Toe Touch', muscleGroups: ['upper-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Decline Sit-Up', muscleGroups: ['upper-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Machine Crunch', muscleGroups: ['upper-abs'], movementPattern: 'core', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Reverse Crunch', muscleGroups: ['lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
  
  // ============================================
  // NECK
  // ============================================
  { name: 'Neck Curl (Harness)', muscleGroups: ['neck'], movementPattern: 'neck', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Neck Extension (Harness)', muscleGroups: ['neck'], movementPattern: 'neck', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Neck Lateral Flexion (Harness)', muscleGroups: ['neck'], movementPattern: 'neck', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Neck Machine (4-Way)', muscleGroups: ['neck'], movementPattern: 'neck', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Plate Neck Curl', muscleGroups: ['neck'], movementPattern: 'neck', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Plate Neck Extension', muscleGroups: ['neck'], movementPattern: 'neck', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Neck Curl (Bodyweight)', muscleGroups: ['neck'], movementPattern: 'neck', equipment: 'bodyweight', defaultFields: ['reps'] },
  { name: 'Neck Bridge', muscleGroups: ['neck'], movementPattern: 'neck', equipment: 'bodyweight', defaultFields: ['time'] },
  { name: 'Wrestler Bridge', muscleGroups: ['neck', 'erector-spinae'], movementPattern: 'neck', equipment: 'bodyweight', defaultFields: ['time'] },
  { name: 'Neck Isometric (Front)', muscleGroups: ['neck'], movementPattern: 'neck', equipment: 'bodyweight', defaultFields: ['time'] },
  { name: 'Neck Isometric (Back)', muscleGroups: ['neck'], movementPattern: 'neck', equipment: 'bodyweight', defaultFields: ['time'] },
  { name: 'Neck Isometric (Side)', muscleGroups: ['neck'], movementPattern: 'neck', equipment: 'bodyweight', defaultFields: ['time'] },
  
  // ============================================
  // CARRIES
  // ============================================
  { name: 'Suitcase Carry', muscleGroups: ['obliques', 'forearms', 'traps'], movementPattern: 'carry', equipment: 'dumbbell', defaultFields: ['weight', 'distance'] },
  { name: 'Overhead Carry', muscleGroups: ['front-delts', 'upper-abs', 'lower-abs', 'traps'], movementPattern: 'carry', equipment: 'dumbbell', defaultFields: ['weight', 'distance'] },
  { name: 'Rack Carry', muscleGroups: ['upper-abs', 'lower-abs', 'forearms'], movementPattern: 'carry', equipment: 'dumbbell', defaultFields: ['weight', 'distance'] },
  { name: 'Trap Bar Carry', muscleGroups: ['forearms', 'traps'], movementPattern: 'carry', equipment: 'barbell', defaultFields: ['weight', 'distance'] },
  
  // ============================================
  // OLYMPIC LIFTS
  // ============================================
  { name: 'Power Clean', muscleGroups: ['erector-spinae', 'glutes', 'hamstrings', 'traps'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Hang Clean', muscleGroups: ['erector-spinae', 'glutes', 'hamstrings', 'traps'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Clean and Jerk', muscleGroups: ['erector-spinae', 'glutes', 'front-delts', 'quads', 'hamstrings'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Snatch', muscleGroups: ['erector-spinae', 'glutes', 'front-delts', 'quads', 'hamstrings'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Power Snatch', muscleGroups: ['erector-spinae', 'glutes', 'front-delts'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Hang Snatch', muscleGroups: ['erector-spinae', 'glutes', 'front-delts'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Clean Pull', muscleGroups: ['erector-spinae', 'glutes', 'hamstrings', 'traps'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Snatch Grip Deadlift', muscleGroups: ['erector-spinae', 'glutes', 'hamstrings'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },


  

    // ============================================
    // ADDITIONAL BODYWEIGHT - Upper Push
    // ============================================
    { name: 'Hindu Push-Up', muscleGroups: ['mid-chest', 'front-delts', 'triceps'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'] },
    { name: 'Clapping Push-Up', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['reps'] },

    // ============================================
    // ADDITIONAL BODYWEIGHT - Upper Pull
    // ============================================
    { name: 'Close-Grip Pull-Up', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'] },
    { name: 'Explosive Pull-Up', muscleGroups: ['lats-upper', 'lats-lower', 'biceps'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['reps'] },

    // ============================================
    // ADDITIONAL BODYWEIGHT - Core
    // ============================================
    { name: 'Hollow Body Rock', muscleGroups: ['upper-abs', 'lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
    { name: 'Knees to Elbows', muscleGroups: ['lower-abs', 'upper-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },
    { name: 'Ab Wheel Rollout (Kneeling)', muscleGroups: ['upper-abs', 'lower-abs'], movementPattern: 'core', equipment: 'bodyweight', defaultFields: ['reps'] },

    // ============================================
    // ADDITIONAL BODYWEIGHT - Lower Body
    // ============================================
    { name: 'Box Jump', muscleGroups: ['quads', 'glutes', 'calves'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'] },
    { name: 'Lunge', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'] },
    { name: 'Reverse Lunge', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'] },
    { name: 'Walking Lunge', muscleGroups: ['quads', 'glutes'], movementPattern: 'squat', equipment: 'bodyweight', defaultFields: ['reps'] },
    { name: 'Single-Leg Deadlift (Bodyweight)', muscleGroups: ['hamstrings', 'glutes'], movementPattern: 'hinge', equipment: 'bodyweight', defaultFields: ['reps'] },

    // ============================================
    // ADDITIONAL BODYWEIGHT - Skills/Holds
    // ============================================
    { name: 'Crow Pose', muscleGroups: ['front-delts', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'] },
    { name: 'Crane Pose', muscleGroups: ['front-delts', 'upper-abs'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'] },
    { name: 'Elbow Lever', muscleGroups: ['front-delts', 'obliques'], movementPattern: 'horizontal-push', equipment: 'bodyweight', defaultFields: ['time'] },
    { name: 'Dead Hang', muscleGroups: ['forearms', 'lats-upper'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['time'] },
    { name: 'One-Arm Hang', muscleGroups: ['forearms', 'lats-upper', 'obliques'], movementPattern: 'vertical-pull', equipment: 'bodyweight', defaultFields: ['time'] },
];

/**
 * Default settings for new installs
 * v1.2: Removed theme (dark mode only)
 */
const defaultSettings: Omit<Setting, 'updatedAt'>[] = [
  { key: 'weightIncrement', value: 2.5 },
  { key: 'weekStartDay', value: 0 }, // 0 = Sunday
];

/**
 * Seed the database with preset exercises and default settings
 * Only runs on fresh install
 */
export async function seedDatabase(): Promise<void> {
  const now = Date.now();

  // Seed exercises
  const exercisesToInsert: Exercise[] = presetExercises.map((exercise) => ({
    ...exercise,
    id: crypto.randomUUID(),
    isPreset: true,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  }));

  await db.exercises.bulkAdd(exercisesToInsert);
  console.log(`Seeded ${exercisesToInsert.length} preset exercises`);

  // Seed default settings (use bulkPut to upsert - avoids conflict if settings exist)
  const settingsToInsert: Setting[] = defaultSettings.map((setting) => ({
    ...setting,
    updatedAt: now,
  }));

  await db.settings.bulkPut(settingsToInsert);
  console.log(`Seeded ${settingsToInsert.length} default settings`);
}
