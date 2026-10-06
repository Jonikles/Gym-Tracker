import { db } from '../db';
import type { PR, PRType, Set } from '../types';
import { calculateE1RM, isE1RMValid } from './e1rm';
import { getPrimaryWeightAndReps, isE1RMEligible } from './volume';
import { isRealWorkout } from './session';

/** The single best candidate value per PR type, and which set achieved it */
type BestCandidates = Partial<Record<'weight' | 'reps' | 'e1rm', { value: number; setId: string }>>;

type MaxByType = Record<'weight' | 'reps' | 'e1rm', number>;

/** Weight/reps of a previously completed, PR-eligible set of the same exercise */
interface HistoricalSet {
  weight: number;
  reps: number;
}

const PR_ELIGIBLE_TECHNIQUES = ['standard', 'failure', 'forcedreps'];

/**
 * Whether a set can produce a weight/reps/e1RM PR: a working set (not warmup)
 * with both weight and reps, using a technique whose numbers are comparable.
 * Shared by the save path, the live preview and the historical comparison.
 */
function isPREligibleSet(set: Set): boolean {
  return (
    !set.isWarmup &&
    !!set.weight &&
    !!set.reps &&
    PR_ELIGIBLE_TECHNIQUES.includes(set.intensityTechnique ?? 'standard')
  );
}

/**
 * Find, across a set of exercise sets, the single best candidate per PR type
 * that beats the existing records. Shared by the save and preview paths so
 * eligibility and "best set wins" logic can't drift between them.
 *
 * A reps PR means more reps than ever before AT YOUR TOP WEIGHT (the higher of
 * the historical weight PR and any set in this batch), compared against the
 * most reps previously achieved at that weight or heavier. More reps at a
 * lighter weight isn't a meaningful record, and the first time at a brand-new
 * top weight is already a weight PR, so it doesn't also count as a reps PR.
 */
function findBestCandidates(
  allSets: Set[],
  maxByType: MaxByType,
  history: HistoricalSet[]
): { best: BestCandidates; previousRepsAtTop: number } {
  const best: BestCandidates = {};
  const sets = allSets.filter(isPREligibleSet);

  let topWeight = maxByType.weight;
  for (const set of sets) {
    const { weight } = getPrimaryWeightAndReps(set);
    if (weight > topWeight) topWeight = weight;
  }

  let previousRepsAtTop = 0;
  for (const h of history) {
    if (h.weight >= topWeight && h.reps > previousRepsAtTop) previousRepsAtTop = h.reps;
  }

  for (const set of sets) {
    const { weight, reps } = getPrimaryWeightAndReps(set);
    if (weight <= 0 || reps <= 0) continue;

    if (
      weight > maxByType.weight &&
      (!best.weight ||
        weight > best.weight.value ||
        // same weight: credit the set with more reps
        (weight === best.weight.value && reps > getRepsOf(sets, best.weight.setId)))
    ) {
      best.weight = { value: weight, setId: set.id };
    }

    if (
      weight >= topWeight &&
      previousRepsAtTop > 0 &&
      reps > previousRepsAtTop &&
      (!best.reps || reps > best.reps.value)
    ) {
      best.reps = { value: reps, setId: set.id };
    }

    if (isE1RMValid(reps) && isE1RMEligible(set.intensityTechnique)) {
      const e1rm = calculateE1RM(weight, reps);
      if (e1rm > maxByType.e1rm && (!best.e1rm || e1rm > best.e1rm.value)) {
        best.e1rm = { value: e1rm, setId: set.id };
      }
    }
  }

  return { best, previousRepsAtTop };
}

function getRepsOf(sets: Set[], setId: string): number {
  const s = sets.find((x) => x.id === setId);
  return s ? getPrimaryWeightAndReps(s).reps : 0;
}

async function getMaxByType(exerciseId: string): Promise<MaxByType> {
  const existingPRs = await db.prs.where('exerciseId').equals(exerciseId).toArray();
  return {
    weight: Math.max(0, ...existingPRs.filter((pr) => pr.type === 'weight').map((pr) => pr.value)),
    reps: Math.max(0, ...existingPRs.filter((pr) => pr.type === 'reps').map((pr) => pr.value)),
    e1rm: Math.max(0, ...existingPRs.filter((pr) => pr.type === 'e1rm').map((pr) => pr.value)),
  };
}

/**
 * PR-eligible sets of this exercise from previously completed real workouts.
 * `excludeSetIds` drops the sets currently being evaluated (in case their
 * session is already marked complete).
 */
async function getHistoricalSets(
  exerciseId: string,
  excludeSetIds: ReadonlySet<string>
): Promise<HistoricalSet[]> {
  const sessionExercises = await db.sessionExercises.where('exerciseId').equals(exerciseId).toArray();
  if (sessionExercises.length === 0) return [];

  const sessionIds = [...new Set(sessionExercises.map((se) => se.sessionId))];
  const sessions = await db.sessions.bulkGet(sessionIds);
  const completed = new Set(
    sessions.filter((s) => s != null && isRealWorkout(s)).map((s) => s!.id)
  );
  const seIds = sessionExercises.filter((se) => completed.has(se.sessionId)).map((se) => se.id);
  if (seIds.length === 0) return [];

  const sets = await db.sets.where('sessionExerciseId').anyOf(seIds).toArray();
  return sets
    .filter((s) => !excludeSetIds.has(s.id) && isPREligibleSet(s))
    .map((s) => getPrimaryWeightAndReps(s));
}

async function evaluate(sets: Set[], exerciseId: string) {
  // Existing records, fetched once so later sets in this session don't compare
  // against records this same session already broke.
  const [maxByType, history] = await Promise.all([
    getMaxByType(exerciseId),
    getHistoricalSets(exerciseId, new globalThis.Set(sets.map((s) => s.id))),
  ]);
  const { best, previousRepsAtTop } = findBestCandidates(sets, maxByType, history);
  const previousFor = (type: 'weight' | 'reps' | 'e1rm') => {
    const v = type === 'reps' ? previousRepsAtTop : maxByType[type];
    return v > 0 ? v : undefined;
  };
  return { best, previousFor };
}

/**
 * Detect and save PRs across every set of an exercise within a single session.
 * Ineligible sets (warmups, missing weight/reps, non-comparable techniques) are
 * ignored, so callers can pass all of the exercise's sets.
 *
 * A record is per exercise, not per set: if multiple sets in the same session each
 * beat the previous record, only the single best (highest) set produces one PR row
 * per type — not one row per qualifying set.
 */
export async function detectAndSaveExercisePRs(
  sets: Set[],
  exerciseId: string
): Promise<PR[]> {
  const { best, previousFor } = await evaluate(sets, exerciseId);

  const now = Date.now();
  const savedPRs: PR[] = [];

  for (const type of ['weight', 'reps', 'e1rm'] as const) {
    const candidate = best[type];
    if (!candidate) continue;

    const pr: PR = {
      id: crypto.randomUUID(),
      exerciseId,
      setId: candidate.setId,
      type,
      value: candidate.value,
      previousValue: previousFor(type),
      achievedAt: now,
      createdAt: now,
    };
    savedPRs.push(pr);
  }

  if (savedPRs.length > 0) await db.prs.bulkAdd(savedPRs);
  return savedPRs;
}

/**
 * Detect PRs across every set of an exercise currently being logged in an active
 * session, WITHOUT saving to DB. Used to show live PR badges during a workout.
 *
 * Uses exactly the same eligibility and comparison as detectAndSaveExercisePRs:
 * if several sets each beat the previous record, only the single best set is
 * flagged — not every qualifying set.
 */
export async function previewExercisePRs(
  sets: Set[],
  exerciseId: string
): Promise<Map<string, PR[]>> {
  const { best, previousFor } = await evaluate(sets, exerciseId);

  const now = Date.now();
  const bySet = new Map<string, PR[]>();

  for (const type of ['weight', 'reps', 'e1rm'] as const) {
    const candidate = best[type];
    if (!candidate) continue;

    const pr: PR = {
      id: `preview-${candidate.setId}-${type}`,
      exerciseId,
      setId: candidate.setId,
      type,
      value: candidate.value,
      previousValue: previousFor(type),
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
