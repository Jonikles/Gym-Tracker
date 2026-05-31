/**
 * Strength standards for the Big 3 lifts (Squat, Bench Press, Deadlift)
 *
 * Standards are expressed as multipliers of bodyweight (1RM / BW ratio).
 * Based on commonly used strength classification systems.
 *
 * Categories:
 *   Beginner  — Untrained / first few months
 *   Novice    — ~6-12 months consistent training
 *   Intermediate — 1-3 years consistent training
 *   Advanced  — 3-5+ years, approaching competitive
 *   Elite     — Competitive / top percentile
 */

export type StrengthLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite';

export interface StrengthStandard {
  /** Multiplier thresholds (1RM / bodyweight). You're at a level if ratio >= threshold */
  beginner: number;
  novice: number;
  intermediate: number;
  advanced: number;
  elite: number;
}

/**
 * Male strength standards (1RM / bodyweight ratios)
 * These are widely referenced benchmarks from strength training literature.
 */
export const MALE_STANDARDS: Record<string, StrengthStandard> = {
  squat: {
    beginner: 0.75,
    novice: 1.25,
    intermediate: 1.75,
    advanced: 2.25,
    elite: 2.75,
  },
  bench: {
    beginner: 0.5,
    novice: 0.75,
    intermediate: 1.25,
    advanced: 1.75,
    elite: 2.0,
  },
  deadlift: {
    beginner: 1.0,
    novice: 1.5,
    intermediate: 2.0,
    advanced: 2.5,
    elite: 3.0,
  },
};

/**
 * Female strength standards (1RM / bodyweight ratios)
 */
export const FEMALE_STANDARDS: Record<string, StrengthStandard> = {
  squat: {
    beginner: 0.5,
    novice: 0.75,
    intermediate: 1.25,
    advanced: 1.75,
    elite: 2.25,
  },
  bench: {
    beginner: 0.25,
    novice: 0.5,
    intermediate: 0.75,
    advanced: 1.0,
    elite: 1.5,
  },
  deadlift: {
    beginner: 0.75,
    novice: 1.0,
    intermediate: 1.5,
    advanced: 2.0,
    elite: 2.5,
  },
};

export const STRENGTH_LEVELS: StrengthLevel[] = [
  'beginner',
  'novice',
  'intermediate',
  'advanced',
  'elite',
];

export const LEVEL_LABELS: Record<StrengthLevel, string> = {
  beginner: 'Beginner',
  novice: 'Novice',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
};

export const LEVEL_COLORS: Record<StrengthLevel, string> = {
  beginner: '#6b7280',    // gray
  novice: '#3b82f6',      // blue
  intermediate: '#22c55e', // green
  advanced: '#f59e0b',    // amber
  elite: '#ef4444',       // red
};

/**
 * Determine the strength level for a given 1RM and bodyweight
 */
export function getStrengthLevel(
  e1rm: number,
  bodyweight: number,
  standards: StrengthStandard
): { level: StrengthLevel; ratio: number; progress: number } {
  if (bodyweight <= 0 || e1rm <= 0) {
    return { level: 'beginner', ratio: 0, progress: 0 };
  }

  const ratio = e1rm / bodyweight;

  // Find the level
  let level: StrengthLevel = 'beginner';
  if (ratio >= standards.elite) level = 'elite';
  else if (ratio >= standards.advanced) level = 'advanced';
  else if (ratio >= standards.intermediate) level = 'intermediate';
  else if (ratio >= standards.novice) level = 'novice';

  // Calculate progress within current level (0-1)
  const thresholds = [0, standards.beginner, standards.novice, standards.intermediate, standards.advanced, standards.elite];
  const levelIndex = STRENGTH_LEVELS.indexOf(level);
  const currentThreshold = thresholds[levelIndex + 1] ?? 0;
  const nextThreshold = thresholds[levelIndex + 2] ?? thresholds[levelIndex + 1] + 0.5;
  const range = nextThreshold - currentThreshold;
  const progress = range > 0 ? Math.min(1, Math.max(0, (ratio - currentThreshold) / range)) : 1;

  return { level, ratio, progress };
}

/**
 * Big 3 exercise names as they appear in the seed database
 */
export const BIG3_EXERCISES = {
  squat: 'Barbell Back Squat',
  bench: 'Barbell Bench Press',
  deadlift: 'Deadlift',
} as const;

export type Big3Lift = keyof typeof BIG3_EXERCISES;

export const BIG3_LABELS: Record<Big3Lift, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  deadlift: 'Deadlift',
};

export const BIG3_EMOJI: Record<Big3Lift, string> = {
  squat: '',
  bench: '',
  deadlift: '',
};
