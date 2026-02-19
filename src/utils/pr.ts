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
 * Save detected PRs to the database
 */
export async function savePRs(
  prResults: PRDetectionResult[],
  exerciseId: string,
  setId: string
): Promise<PR[]> {
  const now = Date.now();
  const savedPRs: PR[] = [];

  for (const result of prResults) {
    const pr: PR = {
      id: crypto.randomUUID(),
      exerciseId,
      setId,
      type: result.type,
      value: result.value,
      previousValue: result.previousValue,
      achievedAt: now,
      createdAt: now,
    };

    await db.prs.add(pr);
    savedPRs.push(pr);
  }

  return savedPRs;
}

/**
 * Detect and save PRs in one operation
 */
export async function detectAndSavePRs(
  set: Set,
  exerciseId: string
): Promise<PR[]> {
  const results = await detectPRs(set, exerciseId);
  if (results.length === 0) return [];
  return savePRs(results, exerciseId, set.id);
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
