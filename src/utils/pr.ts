import { db } from '../db';
import type { PR, PRType, Set } from '../types';
import { calculateE1RM, isE1RMValid } from './e1rm';
import { getPrimaryWeightAndReps, isE1RMEligible } from './volume';

/** The single best candidate value per PR type, and which set achieved it */
type BestCandidates = Partial<Record<'weight' | 'reps' | 'e1rm', { value: number; setId: string }>>;

/**
 * Find, across a set of exercise sets, the single best candidate per PR type
 * that beats the given existing maxes. Shared by the save and preview paths so
 * "best set wins" logic can't drift between them.
 */
function findBestCandidates(
  sets: Set[],
  maxByType: Record<'weight' | 'reps' | 'e1rm', number>
): BestCandidates {
  const best: BestCandidates = {};

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

  return best;
}

async function getMaxByType(exerciseId: string): Promise<Record<'weight' | 'reps' | 'e1rm', number>> {
  const existingPRs = await db.prs.where('exerciseId').equals(exerciseId).toArray();
  return {
    weight: Math.max(0, ...existingPRs.filter((pr) => pr.type === 'weight').map((pr) => pr.value)),
    reps: Math.max(0, ...existingPRs.filter((pr) => pr.type === 'reps').map((pr) => pr.value)),
    e1rm: Math.max(0, ...existingPRs.filter((pr) => pr.type === 'e1rm').map((pr) => pr.value)),
  };
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
  const maxByType = await getMaxByType(exerciseId);
  const best = findBestCandidates(sets, maxByType);

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
 * Detect PRs across every set of an exercise currently being logged in an active
 * session, WITHOUT saving to DB. Used to show live PR badges during a workout.
 *
 * Mirrors detectAndSaveExercisePRs' "best set wins" rule: if several sets in the
 * session each beat the previous record, only the single best set is flagged —
 * not every qualifying set.
 */
export async function previewExercisePRs(
  sets: Set[],
  exerciseId: string
): Promise<Map<string, PR[]>> {
  const maxByType = await getMaxByType(exerciseId);
  const best = findBestCandidates(sets, maxByType);

  const now = Date.now();
  const bySet = new Map<string, PR[]>();

  for (const type of ['weight', 'reps', 'e1rm'] as const) {
    const candidate = best[type];
    if (!candidate) continue;

    const previousValue = maxByType[type] > 0 ? maxByType[type] : undefined;
    const pr: PR = {
      id: `preview-${candidate.setId}-${type}`,
      exerciseId,
      setId: candidate.setId,
      type,
      value: candidate.value,
      previousValue,
      achievedAt: now,
      createdAt: now,
    };

    const list = bySet.get(candidate.setId) ?? [];
    list.push(pr);
    bySet.set(candidate.setId, list);
  }

  return bySet;
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
