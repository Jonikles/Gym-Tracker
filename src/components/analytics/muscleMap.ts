import type { Muscle, IExerciseData } from 'react-body-highlighter';
import type { MuscleGroup } from '../../types/exercise';

/**
 * Map app MuscleGroup keys → react-body-highlighter Muscle names.
 * null = no direct equivalent in the library (omit).
 */
export const MUSCLE_MAP: Record<MuscleGroup, Muscle | null> = {
  // Lower Body
  'calves': 'calves',
  'quads': 'quadriceps',
  'hamstrings': 'hamstring',
  'glutes': 'gluteal',
  'adductors': 'adductor',
  'abductors': 'abductors',
  // Core
  'lower-abs': 'abs',
  'upper-abs': 'abs',
  'obliques': 'obliques',
  // Chest
  'lower-chest': 'chest',
  'mid-chest': 'chest',
  'upper-chest': 'chest',
  // Arms
  'forearms': 'forearm',
  'triceps': 'triceps',
  'biceps': 'biceps',
  'brachioradialis': 'forearm',
  // Shoulders
  'front-delts': 'front-deltoids',
  'side-delts': 'front-deltoids',
  'rear-delts': 'back-deltoids',
  // Back
  'traps': 'trapezius',
  'rhomboids': 'upper-back',
  'lats-upper': 'upper-back',
  'lats-lower': 'lower-back',
  'erector-spinae': 'lower-back',
  // Neck
  'neck': 'neck',
};

/** Reverse map: library Muscle → all app MuscleGroup keys that map to it. */
export const REVERSE_MUSCLE_MAP: Record<string, MuscleGroup[]> = {};
for (const [mg, muscle] of Object.entries(MUSCLE_MAP) as [MuscleGroup, Muscle | null][]) {
  if (!muscle) continue;
  if (!REVERSE_MUSCLE_MAP[muscle]) REVERSE_MUSCLE_MAP[muscle] = [];
  REVERSE_MUSCLE_MAP[muscle].push(mg);
}

/**
 * Body diagram colors (dark UI only). Mirrors --muscle-body / --muscle-highlight
 * in styles/global.css — react-body-highlighter needs literal color strings.
 */
export const MUSCLE_COLORS = {
  body: '#3a3a3a',
  highlight: '#ef4444',
} as const;

/** Heatmap tier colors, index 0 = tier 1 (minimal) … index 4 = tier 5 (highest) */
export const TIER_COLORS = [
  '#4a6670', // tier 1: dim blue-gray
  '#22c55e', // tier 2: green
  '#eab308', // tier 3: yellow
  '#f97316', // tier 4: orange
  '#ef4444', // tier 5: red
];

export const TIER_LABELS = [
  { color: TIER_COLORS[4], label: 'Highest' },
  { color: TIER_COLORS[3], label: 'High' },
  { color: TIER_COLORS[2], label: 'Moderate' },
  { color: TIER_COLORS[1], label: 'Low' },
  { color: TIER_COLORS[0], label: 'Minimal' },
];

/** Tier 1-5 for a volume ratio (vol / maxVol) */
export function volumeTier(ratio: number): number {
  if (ratio > 0.85) return 5;
  if (ratio > 0.65) return 4;
  if (ratio > 0.40) return 3;
  if (ratio > 0.20) return 2;
  return 1;
}

/** Aggregate per-MuscleGroup volume into per-library-muscle volumes + tiered heatmap data */
export function buildMuscleHeatmap(
  distribution: ReadonlyArray<{ muscleGroup: string; volume: number }>
): { muscleVolumes: Map<Muscle, number>; maxVol: number; tieredData: IExerciseData[] } {
  const muscleVolumes = new Map<Muscle, number>();
  for (const d of distribution) {
    const mapped = MUSCLE_MAP[d.muscleGroup as MuscleGroup];
    if (!mapped) continue;
    muscleVolumes.set(mapped, (muscleVolumes.get(mapped) ?? 0) + d.volume);
  }
  const maxVol = Math.max(...muscleVolumes.values(), 1);
  const tieredData: IExerciseData[] = [];
  for (const [muscle, vol] of muscleVolumes) {
    const tier = volumeTier(vol / maxVol);
    tieredData.push({ name: `tier-${tier}`, muscles: [muscle], frequency: tier });
  }
  return { muscleVolumes, maxVol, tieredData };
}
