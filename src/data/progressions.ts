/**
 * Progression definitions from Overcoming Gravity 2nd Edition
 */

export type ProgressionCategory =
  | 'Vertical Push'
  | 'Horizontal Push'
  | 'Vertical Pull'
  | 'Horizontal Pull'
  | 'Core'
  | 'Legs'
  | 'Skill / Rings';

export interface ProgressionDefinition {
  id: string;
  name: string;
  category: ProgressionCategory;
}

export const PROGRESSION_CATEGORIES: ProgressionCategory[] = [
  'Vertical Push',
  'Horizontal Push',
  'Vertical Pull',
  'Horizontal Pull',
  'Core',
  'Legs',
  'Skill / Rings',
];

export const PROGRESSION_DEFINITIONS: ProgressionDefinition[] = [
  // Vertical Push
  { id: 'handstands', name: 'Handstands', category: 'Vertical Push' },
  { id: 'rings-handstand', name: 'Rings Handstand', category: 'Vertical Push' },
  { id: 'hspu', name: 'Handstand Pushups', category: 'Vertical Push' },
  { id: 'rings-hspu', name: 'Rings Handstand Pushups', category: 'Vertical Push' },
  { id: 'press', name: 'Press (Overhead)', category: 'Vertical Push' },
  { id: 'press-handstand', name: 'Press Handstands', category: 'Vertical Push' },
  { id: 'rings-press-handstand', name: 'Rings Press Handstand', category: 'Vertical Push' },
  { id: 'straight-arm-press-hs', name: 'Straight Arm Press Handstand', category: 'Vertical Push' },
  { id: 'dips', name: 'Dips / One Arm Dips', category: 'Vertical Push' },
  { id: 'ring-dips', name: 'Ring Dips', category: 'Vertical Push' },
  { id: 'weighted-dips', name: 'Weighted Dips', category: 'Vertical Push' },

  // Horizontal Push
  { id: 'planche', name: 'Planche (Floor/P-Bars)', category: 'Horizontal Push' },
  { id: 'rings-planche', name: 'Rings Planche', category: 'Horizontal Push' },
  { id: 'planche-pushups', name: 'Planche Pushups', category: 'Horizontal Push' },
  { id: 'rings-planche-pushups', name: 'Rings Planche Pushups', category: 'Horizontal Push' },
  { id: 'pushups', name: 'Pushups', category: 'Horizontal Push' },
  { id: 'one-arm-pushups', name: 'One Arm Pushups', category: 'Horizontal Push' },

  // Vertical Pull
  { id: 'pullups', name: 'Pull-ups', category: 'Vertical Pull' },
  { id: 'rings-pullups-oac', name: 'Rings Pull-ups / One Arm Chin', category: 'Vertical Pull' },
  { id: 'weighted-pullups', name: 'Weighted Pull-ups', category: 'Vertical Pull' },
  { id: 'muscle-ups', name: 'Muscle-ups / Inverted Muscle-ups', category: 'Vertical Pull' },

  // Horizontal Pull
  { id: 'back-lever', name: 'Back Lever', category: 'Horizontal Pull' },
  { id: 'front-lever', name: 'Front Lever', category: 'Horizontal Pull' },
  { id: 'front-lever-rows', name: 'Front Lever Rows', category: 'Horizontal Pull' },
  { id: 'rows', name: 'Rows', category: 'Horizontal Pull' },

  // Core
  { id: 'l-sit', name: 'L-Sit / V-Sit / Manna', category: 'Core' },
  { id: 'hanging-leg-raises', name: 'Hanging Leg Raises', category: 'Core' },
  { id: 'dragon-flag', name: 'Dragon Flag', category: 'Core' },
  { id: 'ab-wheel', name: 'Ab Wheel', category: 'Core' },
  { id: 'flag', name: 'Flag', category: 'Core' },

  // Legs
  { id: 'squats', name: 'Squats', category: 'Legs' },
  { id: 'glute-bridge', name: 'Glute Bridge / Hip Thrusts', category: 'Legs' },
  { id: 'nordic-curl', name: 'Natural Hamstring Curl / Nordic Curl', category: 'Legs' },
  { id: 'shrimp-squat', name: 'Shrimp Squat', category: 'Legs' },
  { id: 'reverse-hyper', name: 'Reverse Hyperextensions', category: 'Legs' },

  // Skill / Rings
  { id: 'elbow-levers', name: 'Elbow Levers', category: 'Skill / Rings' },
  { id: 'iron-cross', name: 'Iron Cross', category: 'Skill / Rings' },
  { id: 'rings-full-statics', name: 'Rings Full Statics', category: 'Skill / Rings' },
  { id: 'rings-kip', name: 'Rings Kip Skills', category: 'Skill / Rings' },
  { id: 'rings-felge', name: 'Rings Felge Skills', category: 'Skill / Rings' },
  { id: 'one-arm-statics', name: 'One Arm Statics', category: 'Skill / Rings' },
];

export const PROGRESSION_MAP: Record<string, ProgressionDefinition> =
  Object.fromEntries(PROGRESSION_DEFINITIONS.map((p) => [p.id, p]));
