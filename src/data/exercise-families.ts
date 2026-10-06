/**
 * Exercise families
 *
 * A family groups gym exercises that a lifter would call "the same exercise,
 * different setup" (e.g. Bench Press: angle x equipment). Families are a
 * grouping layer for the picker / library UI only: every valid parameter
 * combination maps to ONE concrete exercise (matched by name), and history /
 * PRs stay tracked per concrete exercise.
 *
 * Calisthenics / bodyweight / rings / Overcoming Gravity progression exercises
 * are intentionally NOT part of any family; they stay standalone.
 */
import type { MuscleGroup, ExerciseField } from '../types';

export interface FamilyDimensionOption {
  value: string;
  label: string;
}

export interface FamilyDimension {
  key: string;
  label: string;
  /** Ordered most-common-first */
  options: FamilyDimensionOption[];
}

export interface FamilyVariant {
  /** One value per dimension key */
  params: Record<string, string>;
  /** Concrete exercise name (preset name or one of NEW_FAMILY_EXERCISES) */
  exerciseName: string;
}

export interface ExerciseFamily {
  id: string;
  name: string;
  dimensions: FamilyDimension[];
  /** Most common combination */
  defaults: Record<string, string>;
  /** Every valid combination */
  variants: FamilyVariant[];
}

export interface NewFamilyExercise {
  name: string;
  muscleGroups: MuscleGroup[];
  movementPattern: string;
  equipment: string;
  defaultFields: ExerciseField[];
}

// ---------------------------------------------------------------------------
// Small builders to keep the data readable
// ---------------------------------------------------------------------------

function dim(key: string, label: string, options: Array<[string, string]>): FamilyDimension {
  return { key, label, options: options.map(([value, label]) => ({ value, label })) };
}

function v(params: Record<string, string>, exerciseName: string): FamilyVariant {
  return { params, exerciseName };
}

// Shared equipment option labels
const BARBELL: [string, string] = ['barbell', 'Barbell'];
const DUMBBELL: [string, string] = ['dumbbell', 'Dumbbell'];
const CABLE: [string, string] = ['cable', 'Cable'];
const MACHINE: [string, string] = ['machine', 'Machine'];
const SMITH: [string, string] = ['smith', 'Smith Machine'];

// ---------------------------------------------------------------------------
// New preset exercises needed to fill common combinations
// ---------------------------------------------------------------------------

export const NEW_FAMILY_EXERCISES: NewFamilyExercise[] = [
  { name: 'Smith Machine Bench Press', muscleGroups: ['mid-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Incline Smith Machine Bench Press', muscleGroups: ['upper-chest', 'triceps', 'front-delts'], movementPattern: 'horizontal-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Seated Barbell Overhead Press', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Smith Machine Shoulder Press', muscleGroups: ['front-delts', 'side-delts', 'triceps'], movementPattern: 'vertical-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'EZ-Bar Preacher Curl', muscleGroups: ['biceps'], movementPattern: 'vertical-pull', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Overhead Cable Tricep Extension', muscleGroups: ['triceps'], movementPattern: 'vertical-push', equipment: 'cable', defaultFields: ['weight', 'reps'] },
  { name: 'Trap Bar Deadlift', muscleGroups: ['quads', 'glutes', 'hamstrings', 'erector-spinae', 'traps'], movementPattern: 'hinge', equipment: 'barbell', defaultFields: ['weight', 'reps'] },
  { name: 'Smith Machine Calf Raise', muscleGroups: ['calves'], movementPattern: 'vertical-push', equipment: 'machine', defaultFields: ['weight', 'reps'] },
  { name: 'Reverse Wrist Curl (Dumbbell)', muscleGroups: ['forearms'], movementPattern: 'vertical-pull', equipment: 'dumbbell', defaultFields: ['weight', 'reps'] },
];

// ---------------------------------------------------------------------------
// Families
// ---------------------------------------------------------------------------

export const EXERCISE_FAMILIES: ExerciseFamily[] = [
  // ======================== CHEST ========================
  {
    id: 'bench-press',
    name: 'Bench Press',
    dimensions: [
      dim('angle', 'Angle', [['flat', 'Flat'], ['incline', 'Incline'], ['decline', 'Decline']]),
      dim('equipment', 'Equipment', [BARBELL, DUMBBELL, SMITH, MACHINE]),
    ],
    defaults: { angle: 'flat', equipment: 'barbell' },
    variants: [
      v({ angle: 'flat', equipment: 'barbell' }, 'Barbell Bench Press'),
      v({ angle: 'incline', equipment: 'barbell' }, 'Incline Barbell Bench Press'),
      v({ angle: 'decline', equipment: 'barbell' }, 'Decline Barbell Bench Press'),
      v({ angle: 'flat', equipment: 'dumbbell' }, 'Dumbbell Bench Press'),
      v({ angle: 'incline', equipment: 'dumbbell' }, 'Incline Dumbbell Bench Press'),
      v({ angle: 'decline', equipment: 'dumbbell' }, 'Decline Dumbbell Bench Press'),
      v({ angle: 'flat', equipment: 'smith' }, 'Smith Machine Bench Press'),
      v({ angle: 'incline', equipment: 'smith' }, 'Incline Smith Machine Bench Press'),
      v({ angle: 'flat', equipment: 'machine' }, 'Machine Chest Press'),
      v({ angle: 'incline', equipment: 'machine' }, 'Incline Machine Press'),
    ],
  },
  {
    id: 'chest-fly',
    name: 'Chest Fly',
    dimensions: [
      dim('equipment', 'Equipment', [DUMBBELL, CABLE, ['machine', 'Machine (Pec Deck)']]),
      dim('angle', 'Angle', [['flat', 'Flat / Mid'], ['incline', 'Incline'], ['high-to-low', 'High to Low'], ['low-to-high', 'Low to High']]),
    ],
    defaults: { equipment: 'dumbbell', angle: 'flat' },
    variants: [
      v({ equipment: 'dumbbell', angle: 'flat' }, 'Dumbbell Fly'),
      v({ equipment: 'dumbbell', angle: 'incline' }, 'Incline Dumbbell Fly'),
      v({ equipment: 'cable', angle: 'flat' }, 'Cable Fly'),
      v({ equipment: 'cable', angle: 'high-to-low' }, 'High Cable Fly'),
      v({ equipment: 'cable', angle: 'low-to-high' }, 'Low Cable Fly'),
      v({ equipment: 'machine', angle: 'flat' }, 'Pec Deck'),
    ],
  },

  // ======================== BACK ========================
  {
    id: 'row',
    name: 'Row',
    dimensions: [
      dim('equipment', 'Equipment', [BARBELL, DUMBBELL, CABLE, MACHINE]),
      dim('style', 'Style', [['standard', 'Standard'], ['single-arm', 'Single-Arm'], ['chest-supported', 'Chest-Supported'], ['pendlay', 'Pendlay'], ['t-bar', 'T-Bar']]),
    ],
    defaults: { equipment: 'barbell', style: 'standard' },
    variants: [
      v({ equipment: 'barbell', style: 'standard' }, 'Barbell Row'),
      v({ equipment: 'barbell', style: 'pendlay' }, 'Pendlay Row'),
      v({ equipment: 'barbell', style: 't-bar' }, 'T-Bar Row'),
      v({ equipment: 'dumbbell', style: 'standard' }, 'Dumbbell Row'),
      v({ equipment: 'dumbbell', style: 'single-arm' }, 'Single-Arm Dumbbell Row'),
      v({ equipment: 'dumbbell', style: 'chest-supported' }, 'Chest-Supported Dumbbell Row'),
      v({ equipment: 'cable', style: 'standard' }, 'Seated Cable Row'),
      v({ equipment: 'cable', style: 'single-arm' }, 'Single-Arm Cable Row'),
      v({ equipment: 'machine', style: 'standard' }, 'Machine Row'),
    ],
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    dimensions: [
      dim('grip', 'Grip', [['standard', 'Standard'], ['wide', 'Wide'], ['close', 'Close'], ['neutral', 'Neutral']]),
      dim('equipment', 'Equipment', [CABLE, MACHINE]),
    ],
    defaults: { grip: 'standard', equipment: 'cable' },
    variants: [
      v({ grip: 'standard', equipment: 'cable' }, 'Lat Pulldown'),
      v({ grip: 'wide', equipment: 'cable' }, 'Wide-Grip Lat Pulldown'),
      v({ grip: 'close', equipment: 'cable' }, 'Close-Grip Lat Pulldown'),
      v({ grip: 'neutral', equipment: 'cable' }, 'Neutral-Grip Lat Pulldown'),
      v({ grip: 'standard', equipment: 'machine' }, 'Machine Lat Pulldown'),
    ],
  },
  {
    id: 'shrug',
    name: 'Shrug',
    dimensions: [dim('equipment', 'Equipment', [BARBELL, DUMBBELL, CABLE, MACHINE])],
    defaults: { equipment: 'barbell' },
    variants: [
      v({ equipment: 'barbell' }, 'Barbell Shrug'),
      v({ equipment: 'dumbbell' }, 'Dumbbell Shrug'),
      v({ equipment: 'cable' }, 'Cable Shrug'),
      v({ equipment: 'machine' }, 'Machine Shrug'),
    ],
  },

  // ======================== SHOULDERS ========================
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    dimensions: [
      dim('equipment', 'Equipment', [BARBELL, DUMBBELL, MACHINE, SMITH]),
      dim('position', 'Position', [['standing', 'Standing'], ['seated', 'Seated']]),
    ],
    defaults: { equipment: 'barbell', position: 'standing' },
    variants: [
      v({ equipment: 'barbell', position: 'standing' }, 'Overhead Press'),
      v({ equipment: 'barbell', position: 'seated' }, 'Seated Barbell Overhead Press'),
      v({ equipment: 'dumbbell', position: 'standing' }, 'Dumbbell Shoulder Press'),
      v({ equipment: 'dumbbell', position: 'seated' }, 'Seated Dumbbell Press'),
      v({ equipment: 'machine', position: 'seated' }, 'Machine Shoulder Press'),
      v({ equipment: 'smith', position: 'seated' }, 'Smith Machine Shoulder Press'),
    ],
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    dimensions: [dim('equipment', 'Equipment', [DUMBBELL, CABLE, MACHINE])],
    defaults: { equipment: 'dumbbell' },
    variants: [
      v({ equipment: 'dumbbell' }, 'Dumbbell Lateral Raise'),
      v({ equipment: 'cable' }, 'Cable Lateral Raise'),
      v({ equipment: 'machine' }, 'Machine Lateral Raise'),
    ],
  },
  {
    id: 'front-raise',
    name: 'Front Raise',
    dimensions: [dim('equipment', 'Equipment', [DUMBBELL, CABLE, BARBELL])],
    defaults: { equipment: 'dumbbell' },
    variants: [
      v({ equipment: 'dumbbell' }, 'Dumbbell Front Raise'),
      v({ equipment: 'cable' }, 'Cable Front Raise'),
      v({ equipment: 'barbell' }, 'Barbell Front Raise'),
    ],
  },
  {
    id: 'rear-delt-fly',
    name: 'Rear Delt Fly',
    dimensions: [dim('equipment', 'Equipment', [DUMBBELL, ['machine', 'Machine (Reverse Pec Deck)'], CABLE])],
    defaults: { equipment: 'dumbbell' },
    variants: [
      v({ equipment: 'dumbbell' }, 'Dumbbell Rear Delt Fly'),
      v({ equipment: 'machine' }, 'Reverse Pec Deck'),
      v({ equipment: 'cable' }, 'Cable Rear Delt Fly'),
    ],
  },
  {
    id: 'upright-row',
    name: 'Upright Row',
    dimensions: [dim('equipment', 'Equipment', [BARBELL, DUMBBELL, CABLE])],
    defaults: { equipment: 'barbell' },
    variants: [
      v({ equipment: 'barbell' }, 'Barbell Upright Row'),
      v({ equipment: 'dumbbell' }, 'Dumbbell Upright Row'),
      v({ equipment: 'cable' }, 'Cable Upright Row'),
    ],
  },

  // ======================== ARMS ========================
  {
    id: 'biceps-curl',
    name: 'Biceps Curl',
    dimensions: [
      dim('equipment', 'Equipment', [BARBELL, DUMBBELL, ['ez-bar', 'EZ-Bar'], CABLE, MACHINE]),
      dim('style', 'Style', [
        ['standard', 'Standard'],
        ['hammer', 'Hammer'],
        ['preacher', 'Preacher'],
        ['incline', 'Incline'],
        ['reverse', 'Reverse Grip'],
        ['concentration', 'Concentration'],
        ['spider', 'Spider'],
      ]),
    ],
    defaults: { equipment: 'barbell', style: 'standard' },
    variants: [
      v({ equipment: 'barbell', style: 'standard' }, 'Barbell Curl'),
      v({ equipment: 'barbell', style: 'preacher' }, 'Preacher Curl (Barbell)'),
      v({ equipment: 'barbell', style: 'reverse' }, 'Reverse Curl (Barbell)'),
      v({ equipment: 'dumbbell', style: 'standard' }, 'Dumbbell Curl'),
      v({ equipment: 'dumbbell', style: 'hammer' }, 'Hammer Curl'),
      v({ equipment: 'dumbbell', style: 'preacher' }, 'Preacher Curl (Dumbbell)'),
      v({ equipment: 'dumbbell', style: 'incline' }, 'Incline Dumbbell Curl'),
      v({ equipment: 'dumbbell', style: 'reverse' }, 'Reverse Curl (Dumbbell)'),
      v({ equipment: 'dumbbell', style: 'concentration' }, 'Concentration Curl'),
      v({ equipment: 'dumbbell', style: 'spider' }, 'Spider Curl'),
      v({ equipment: 'ez-bar', style: 'standard' }, 'EZ-Bar Curl'),
      v({ equipment: 'ez-bar', style: 'preacher' }, 'EZ-Bar Preacher Curl'),
      v({ equipment: 'cable', style: 'standard' }, 'Cable Curl'),
      v({ equipment: 'cable', style: 'hammer' }, 'Cable Hammer Curl'),
      v({ equipment: 'cable', style: 'reverse' }, 'Reverse Curl (Cable)'),
      v({ equipment: 'machine', style: 'standard' }, 'Machine Curl'),
      v({ equipment: 'machine', style: 'preacher' }, 'Machine Preacher Curl'),
    ],
  },
  {
    id: 'triceps-extension',
    name: 'Triceps Extension',
    dimensions: [
      dim('position', 'Position', [['lying', 'Lying (Skull Crusher)'], ['overhead', 'Overhead']]),
      dim('equipment', 'Equipment', [BARBELL, DUMBBELL, CABLE]),
    ],
    defaults: { position: 'lying', equipment: 'barbell' },
    variants: [
      v({ position: 'lying', equipment: 'barbell' }, 'Skull Crusher'),
      v({ position: 'lying', equipment: 'dumbbell' }, 'Dumbbell Skull Crusher'),
      v({ position: 'overhead', equipment: 'dumbbell' }, 'Overhead Tricep Extension'),
      v({ position: 'overhead', equipment: 'cable' }, 'Overhead Cable Tricep Extension'),
    ],
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    dimensions: [dim('attachment', 'Attachment', [['bar', 'Bar'], ['rope', 'Rope'], ['single-handle', 'Single-Arm']])],
    defaults: { attachment: 'bar' },
    variants: [
      v({ attachment: 'bar' }, 'Tricep Pushdown'),
      v({ attachment: 'rope' }, 'Rope Pushdown'),
      v({ attachment: 'single-handle' }, 'Single-Arm Cable Pushdown'),
    ],
  },
  {
    id: 'wrist-curl',
    name: 'Wrist Curl',
    dimensions: [
      dim('direction', 'Direction', [['standard', 'Standard (Palms Up)'], ['reverse', 'Reverse (Palms Down)']]),
      dim('equipment', 'Equipment', [BARBELL, DUMBBELL]),
    ],
    defaults: { direction: 'standard', equipment: 'barbell' },
    variants: [
      v({ direction: 'standard', equipment: 'barbell' }, 'Wrist Curl (Barbell)'),
      v({ direction: 'standard', equipment: 'dumbbell' }, 'Wrist Curl (Dumbbell)'),
      v({ direction: 'reverse', equipment: 'barbell' }, 'Reverse Wrist Curl (Barbell)'),
      v({ direction: 'reverse', equipment: 'dumbbell' }, 'Reverse Wrist Curl (Dumbbell)'),
    ],
  },

  // ======================== LEGS ========================
  {
    id: 'squat',
    name: 'Squat',
    dimensions: [
      dim('variation', 'Variation', [
        ['back', 'Barbell Back'],
        ['front', 'Barbell Front'],
        ['smith', 'Smith Machine'],
        ['goblet', 'Goblet'],
        ['hack', 'Hack Squat'],
        ['pendulum', 'Pendulum'],
        ['belt', 'Belt Squat'],
        ['zercher', 'Zercher'],
      ]),
    ],
    defaults: { variation: 'back' },
    variants: [
      v({ variation: 'back' }, 'Barbell Back Squat'),
      v({ variation: 'front' }, 'Barbell Front Squat'),
      v({ variation: 'smith' }, 'Smith Machine Squat'),
      v({ variation: 'goblet' }, 'Goblet Squat'),
      v({ variation: 'hack' }, 'Hack Squat'),
      v({ variation: 'pendulum' }, 'Pendulum Squat'),
      v({ variation: 'belt' }, 'Belt Squat'),
      v({ variation: 'zercher' }, 'Zercher Squat'),
    ],
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    dimensions: [
      dim('style', 'Style', [['conventional', 'Conventional'], ['romanian', 'Romanian'], ['sumo', 'Sumo'], ['stiff-leg', 'Stiff-Leg']]),
      dim('equipment', 'Equipment', [BARBELL, ['trap-bar', 'Trap Bar'], DUMBBELL]),
    ],
    defaults: { style: 'conventional', equipment: 'barbell' },
    variants: [
      v({ style: 'conventional', equipment: 'barbell' }, 'Deadlift'),
      v({ style: 'conventional', equipment: 'trap-bar' }, 'Trap Bar Deadlift'),
      v({ style: 'romanian', equipment: 'barbell' }, 'Romanian Deadlift'),
      v({ style: 'romanian', equipment: 'dumbbell' }, 'Dumbbell Romanian Deadlift'),
      v({ style: 'sumo', equipment: 'barbell' }, 'Sumo Deadlift'),
      v({ style: 'stiff-leg', equipment: 'barbell' }, 'Stiff-Leg Deadlift'),
    ],
  },
  {
    id: 'lunge',
    name: 'Lunge',
    dimensions: [
      dim('direction', 'Type', [['forward', 'Forward'], ['walking', 'Walking'], ['reverse', 'Reverse']]),
      dim('equipment', 'Equipment', [DUMBBELL, BARBELL]),
    ],
    defaults: { direction: 'forward', equipment: 'dumbbell' },
    variants: [
      v({ direction: 'forward', equipment: 'dumbbell' }, 'Dumbbell Lunge'),
      v({ direction: 'forward', equipment: 'barbell' }, 'Barbell Lunge'),
      v({ direction: 'walking', equipment: 'dumbbell' }, 'Walking Lunge (Dumbbell)'),
      v({ direction: 'walking', equipment: 'barbell' }, 'Walking Lunge (Barbell)'),
      v({ direction: 'reverse', equipment: 'dumbbell' }, 'Reverse Lunge (Dumbbell)'),
    ],
  },
  {
    id: 'leg-curl',
    name: 'Leg Curl',
    dimensions: [dim('position', 'Position', [['lying', 'Lying'], ['seated', 'Seated'], ['standing', 'Standing']])],
    defaults: { position: 'lying' },
    variants: [
      v({ position: 'lying' }, 'Lying Leg Curl'),
      v({ position: 'seated' }, 'Seated Leg Curl'),
      v({ position: 'standing' }, 'Standing Leg Curl'),
    ],
  },
  {
    id: 'good-morning',
    name: 'Good Morning',
    dimensions: [dim('equipment', 'Equipment', [BARBELL, DUMBBELL])],
    defaults: { equipment: 'barbell' },
    variants: [
      v({ equipment: 'barbell' }, 'Good Morning'),
      v({ equipment: 'dumbbell' }, 'Dumbbell Good Morning'),
    ],
  },
  {
    id: 'calf-raise',
    name: 'Calf Raise',
    dimensions: [
      dim('position', 'Position', [['standing', 'Standing'], ['seated', 'Seated'], ['leg-press', 'Leg Press'], ['donkey', 'Donkey']]),
      dim('equipment', 'Equipment', [MACHINE, SMITH, BARBELL, DUMBBELL]),
    ],
    defaults: { position: 'standing', equipment: 'machine' },
    variants: [
      v({ position: 'standing', equipment: 'machine' }, 'Standing Calf Raise (Machine)'),
      v({ position: 'standing', equipment: 'smith' }, 'Smith Machine Calf Raise'),
      v({ position: 'standing', equipment: 'barbell' }, 'Barbell Calf Raise'),
      v({ position: 'standing', equipment: 'dumbbell' }, 'Dumbbell Calf Raise'),
      v({ position: 'seated', equipment: 'machine' }, 'Seated Calf Raise'),
      v({ position: 'leg-press', equipment: 'machine' }, 'Leg Press Calf Raise'),
      v({ position: 'donkey', equipment: 'machine' }, 'Donkey Calf Raise'),
    ],
  },

  // ======================== GLUTES / HIPS ========================
  {
    id: 'hip-thrust',
    name: 'Hip Thrust',
    dimensions: [
      dim('setup', 'Setup', [['bench', 'Back on Bench (Hip Thrust)'], ['floor', 'Floor (Glute Bridge)']]),
      dim('equipment', 'Equipment', [BARBELL, MACHINE, DUMBBELL]),
    ],
    defaults: { setup: 'bench', equipment: 'barbell' },
    variants: [
      v({ setup: 'bench', equipment: 'barbell' }, 'Barbell Hip Thrust'),
      v({ setup: 'bench', equipment: 'machine' }, 'Hip Thrust Machine'),
      v({ setup: 'bench', equipment: 'dumbbell' }, 'Dumbbell Hip Thrust'),
      v({ setup: 'floor', equipment: 'barbell' }, 'Barbell Glute Bridge'),
    ],
  },
  {
    id: 'glute-kickback',
    name: 'Glute Kickback',
    dimensions: [dim('equipment', 'Equipment', [CABLE, MACHINE])],
    defaults: { equipment: 'cable' },
    variants: [
      v({ equipment: 'cable' }, 'Cable Kickback'),
      v({ equipment: 'machine' }, 'Glute Kickback Machine'),
    ],
  },
  {
    id: 'hip-adduction',
    name: 'Hip Adduction',
    dimensions: [dim('equipment', 'Equipment', [MACHINE, CABLE])],
    defaults: { equipment: 'machine' },
    variants: [
      v({ equipment: 'machine' }, 'Hip Adduction Machine'),
      v({ equipment: 'cable' }, 'Cable Hip Adduction'),
    ],
  },
  {
    id: 'hip-abduction',
    name: 'Hip Abduction',
    dimensions: [dim('equipment', 'Equipment', [MACHINE, CABLE])],
    defaults: { equipment: 'machine' },
    variants: [
      v({ equipment: 'machine' }, 'Hip Abduction Machine'),
      v({ equipment: 'cable' }, 'Cable Hip Abduction'),
    ],
  },

  // ======================== CORE ========================
  {
    id: 'weighted-crunch',
    name: 'Weighted Crunch',
    dimensions: [dim('equipment', 'Equipment', [CABLE, MACHINE])],
    defaults: { equipment: 'cable' },
    variants: [
      v({ equipment: 'cable' }, 'Cable Crunch'),
      v({ equipment: 'machine' }, 'Machine Crunch'),
    ],
  },

  // ======================== NECK ========================
  {
    id: 'neck-curl',
    name: 'Neck Curl',
    dimensions: [dim('equipment', 'Equipment', [['plate', 'Plate'], ['harness', 'Harness']])],
    defaults: { equipment: 'plate' },
    variants: [
      v({ equipment: 'plate' }, 'Plate Neck Curl'),
      v({ equipment: 'harness' }, 'Neck Curl (Harness)'),
    ],
  },
  {
    id: 'neck-extension',
    name: 'Neck Extension',
    dimensions: [dim('equipment', 'Equipment', [['plate', 'Plate'], ['harness', 'Harness']])],
    defaults: { equipment: 'plate' },
    variants: [
      v({ equipment: 'plate' }, 'Plate Neck Extension'),
      v({ equipment: 'harness' }, 'Neck Extension (Harness)'),
    ],
  },

  // ======================== CARRIES ========================
  {
    id: 'farmers-walk',
    name: 'Farmers Walk',
    dimensions: [dim('equipment', 'Equipment', [DUMBBELL, ['trap-bar', 'Trap Bar']])],
    defaults: { equipment: 'dumbbell' },
    variants: [
      v({ equipment: 'dumbbell' }, 'Farmers Walk'),
      v({ equipment: 'trap-bar' }, 'Trap Bar Carry'),
    ],
  },

  // ======================== OLYMPIC ========================
  {
    id: 'clean',
    name: 'Clean',
    dimensions: [dim('start', 'Start Position', [['floor', 'Floor (Power Clean)'], ['hang', 'Hang']])],
    defaults: { start: 'floor' },
    variants: [
      v({ start: 'floor' }, 'Power Clean'),
      v({ start: 'hang' }, 'Hang Clean'),
    ],
  },
  {
    id: 'snatch',
    name: 'Snatch',
    dimensions: [dim('style', 'Style', [['full', 'Full (Squat)'], ['power', 'Power'], ['hang', 'Hang']])],
    defaults: { style: 'full' },
    variants: [
      v({ style: 'full' }, 'Snatch'),
      v({ style: 'power' }, 'Power Snatch'),
      v({ style: 'hang' }, 'Hang Snatch'),
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nameIndex: Map<string, { family: ExerciseFamily; params: Record<string, string> }> | undefined;

function getNameIndex() {
  if (!nameIndex) {
    nameIndex = new Map();
    for (const family of EXERCISE_FAMILIES) {
      for (const variant of family.variants) {
        nameIndex.set(variant.exerciseName.toLowerCase(), { family, params: variant.params });
      }
    }
  }
  return nameIndex;
}

/** True if the concrete exercise name belongs to some family. Case-insensitive. */
export function isFamilyExerciseName(name: string): boolean {
  return getNameIndex().has(name.toLowerCase());
}

export function getFamilyById(id: string): ExerciseFamily | undefined {
  return EXERCISE_FAMILIES.find((f) => f.id === id);
}

/** Find the family (and the params) a concrete exercise belongs to. Case-insensitive. */
export function findFamilyForExerciseName(
  name: string,
): { family: ExerciseFamily; params: Record<string, string> } | undefined {
  const hit = getNameIndex().get(name.toLowerCase());
  return hit ? { family: hit.family, params: { ...hit.params } } : undefined;
}

/** Exact match on every dimension of the family. */
export function resolveVariant(
  family: ExerciseFamily,
  params: Record<string, string>,
): FamilyVariant | undefined {
  return family.variants.find((variant) =>
    family.dimensions.every((d) => variant.params[d.key] === params[d.key]),
  );
}

/**
 * True if some variant has `dimKey = value` AND matches every OTHER currently
 * selected dimension in `params` exactly (unset dims are ignored).
 */
export function isOptionAvailable(
  family: ExerciseFamily,
  params: Record<string, string>,
  dimKey: string,
  value: string,
): boolean {
  return family.variants.some((variant) => {
    if (variant.params[dimKey] !== value) return false;
    return family.dimensions.every(
      (d) => d.key === dimKey || params[d.key] === undefined || variant.params[d.key] === params[d.key],
    );
  });
}
