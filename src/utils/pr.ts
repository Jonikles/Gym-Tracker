import { db } from '../db';
import type { PR, PRType, Set } from '../types';
import { calculateE1RM, isE1RMValid } from './e1rm';
import { getPrimaryWeightAndReps, isE1RMEligible } from './volume';

/**
 * Result of PR detection
 */
export interface PRDetectionResult {
  type: PRType;
  value: number;
  previousValue?: number;
  improvement?: number;
}

/**
 * Detect PRs for a set
 * 
 * Returns array of PRs that were achieved (can be multiple types)
 * Only checks working sets (not warmups)
 * 
 * e1RM is only calculated for:
 * - standard, failure, forcedreps
 * - partials (using main set reps only)
 * 
 * e1RM is NOT calculated for:
 * - myoreps, dropset, cluster (too variable)
 */
export async function detectPRs(
  set: Set,
  exerciseId: string
): Promise<PRDetectionResult[]> {
  // Skip warmup sets
  if (set.isWarmup) return [];

  // Get primary weight/reps (for partials, uses main set only)
  const { weight, reps } = getPrimaryWeightAndReps(set);

  if (weight <= 0 && reps <= 0) return [];

  const results: PRDetectionResult[] = [];

  // Get existing PRs for this exercise
  const existingPRs = await db.prs
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();

  // Check weight PR
  if (weight > 0) {
    const weightPRs = existingPRs.filter((pr) => pr.type === 'weight');
    const maxWeight = Math.max(0, ...weightPRs.map((pr) => pr.value));

    if (weight > maxWeight) {
      results.push({
        type: 'weight',
        value: weight,
        previousValue: maxWeight > 0 ? maxWeight : undefined,
        improvement: maxWeight > 0 ? weight - maxWeight : undefined,
      });
    }
  }

  // Check reps PR
  if (reps > 0) {
    const repsPRs = existingPRs.filter((pr) => pr.type === 'reps');
    const maxReps = Math.max(0, ...repsPRs.map((pr) => pr.value));

    if (reps > maxReps) {
      results.push({
        type: 'reps',
        value: reps,
        previousValue: maxReps > 0 ? maxReps : undefined,
        improvement: maxReps > 0 ? reps - maxReps : undefined,
      });
    }
  }

  // Check e1RM PR (only for eligible techniques and reps ≤ 10)
  // Skip e1RM for myoreps, dropset, cluster - too variable
  if (weight > 0 && reps > 0 && isE1RMValid(reps) && isE1RMEligible(set.intensityTechnique)) {
    const e1rm = calculateE1RM(weight, reps);
    const e1rmPRs = existingPRs.filter((pr) => pr.type === 'e1rm');
    const maxE1RM = Math.max(0, ...e1rmPRs.map((pr) => pr.value));

    if (e1rm > maxE1RM) {
      results.push({
        type: 'e1rm',
        value: e1rm,
        previousValue: maxE1RM > 0 ? maxE1RM : undefined,
        improvement: maxE1RM > 0 ? e1rm - maxE1RM : undefined,
      });
    }
  }

  return results;
}

/**
 * Detect and save PRs across every eligible set of an exercise within a single session.
 *
 * A record is per exercise, not per set: if multiple sets in the same session each
 * beat the previous record, only the single best (highest) set produces one PR row
 * per type — not one row per qualifying set.
 */
export async function detectAndSaveExercisePRs(
  sets: Set[],
  exerciseId: string
): Promise<PR[]> {
  // Existing PRs, fetched once so later sets in this session don't compare
  // against records this same session already broke.
  const existingPRs = await db.prs
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();

  const maxByType: Record<PRType, number> = {
    weight: Math.max(0, ...existingPRs.filter((pr) => pr.type === 'weight').map((pr) => pr.value)),
    reps: Math.max(0, ...existingPRs.filter((pr) => pr.type === 'reps').map((pr) => pr.value)),
    e1rm: Math.max(0, ...existingPRs.filter((pr) => pr.type === 'e1rm').map((pr) => pr.value)),
    progression: 0,
  };

  // Track the best candidate per type across all sets in this session
  const best: Partial<Record<PRType, { value: number; setId: string }>> = {};

  for (const set of sets) {
    if (set.isWarmup) continue;

    const { weight, reps } = getPrimaryWeightAndReps(set);
    if (weight <= 0 && reps <= 0) continue;

    if (weight > maxByType.weight && (!best.weight || weight > best.weight.value)) {
      best.weight = { value: weight, setId: set.id };
    }

    if (reps > maxByType.reps && (!best.reps || reps > best.reps.value)) {
      best.reps = { value: reps, setId: set.id };
    }

    if (weight > 0 && reps > 0 && isE1RMValid(reps) && isE1RMEligible(set.intensityTechnique)) {
      const e1rm = calculateE1RM(weight, reps);
      if (e1rm > maxByType.e1rm && (!best.e1rm || e1rm > best.e1rm.value)) {
        best.e1rm = { value: e1rm, setId: set.id };
      }
    }
  }

  const now = Date.now();
  const savedPRs: PR[] = [];

  for (const type of ['weight', 'reps', 'e1rm'] as const) {
    const candidate = best[type];
    if (!candidate) continue;

    const previousValue = maxByType[type] > 0 ? maxByType[type] : undefined;
    const pr: PR = {
      id: crypto.randomUUID(),
      exerciseId,
      setId: candidate.setId,
      type,
      value: candidate.value,
      previousValue,
      achievedAt: now,
      createdAt: now,
    };

    await db.prs.add(pr);
    savedPRs.push(pr);
  }

  return savedPRs;
}

/**
 * Detect PRs and return them as PR objects WITHOUT saving to DB.
 * Used during active workout to show live PR badges.
 */
export async function detectPRsPreview(
  set: Set,
  exerciseId: string
): Promise<PR[]> {
  const results = await detectPRs(set, exerciseId);
  if (results.length === 0) return [];

  const now = Date.now();
  return results.map((result) => ({
    id: `preview-${set.id}-${result.type}`,
    exerciseId,
    setId: set.id,
    type: result.type,
    value: result.value,
    previousValue: result.previousValue,
    achievedAt: now,
    createdAt: now,
  }));
}

/**
 * Format PR type for display
 */
export function formatPRType(type: PRType): string {
  switch (type) {
    case 'weight':
      return 'Weight';
    case 'reps':
      return 'Reps';
    case 'e1rm':
      return 'e1RM';
    case 'progression':
      return 'Level Up';
    default:
      return type;
  }
}

/**
 * Format PR value for display
 */
export function formatPRValue(type: PRType, value: number): string {
  switch (type) {
    case 'weight':
      return `${value}kg`;
    case 'reps':
      return `${value} reps`;
    case 'e1rm':
      return `${value.toFixed(1)}kg`;
    case 'progression':
      return `Lv.${value}`;
    default:
      return String(value);
  }
}
