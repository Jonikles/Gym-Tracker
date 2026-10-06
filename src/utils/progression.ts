import { db } from '../db';
import type { PR, Set } from '../types';
import { PROGRESSION_MAP } from '../data/progressions';

/**
 * Result of progression level-up detection
 */
export interface ProgressionAdvancement {
  progressionId: string;
  progressionName: string;
  newLevel: number;
  previousLevel: number;
}

/**
 * Detect if completing a set for this exercise represents a progression level-up.
 *
 * A level-up occurs when the exercise belongs to a progression and its level
 * is higher than any previously used exercise in that same progression.
 *
 * Returns an array because an exercise can belong to multiple progressions.
 */
async function detectProgressionAdvancements(
  exerciseId: string
): Promise<ProgressionAdvancement[]> {
  const exercise = await db.exercises.get(exerciseId);
  if (!exercise?.progressionMemberships?.length) return [];

  const memberships = exercise.progressionMemberships.filter((m) => PROGRESSION_MAP[m.progressionId]);
  if (memberships.length === 0) return [];
  const progressionIds = new Set(memberships.map((m) => m.progressionId));

  // All indexed / one-pass reads, done once for every membership:
  // - all progression PRs (indexed by type)
  // - exercises belonging to any of these progressions (one pass over exercises)
  // - which of those exercises have ever been used (indexed anyOf on exerciseId)
  const [progressionPRs, candidateExercises] = await Promise.all([
    db.prs.where('type').equals('progression').toArray(),
    db.exercises
      .filter((e) => e.progressionMemberships?.some((pm) => progressionIds.has(pm.progressionId)) ?? false)
      .toArray(),
  ]);
  const otherIds = candidateExercises.map((e) => e.id).filter((id) => id !== exerciseId);
  const usedExerciseIds = new Set(
    otherIds.length > 0
      ? ((await db.sessionExercises.where('exerciseId').anyOf(otherIds).keys()) as string[])
      : []
  );

  const advancements: ProgressionAdvancement[] = [];

  for (const membership of memberships) {
    const { progressionId, level } = membership;
    const definition = PROGRESSION_MAP[progressionId];

    // If we already recorded a PR for this exact exercise + progression, skip
    const alreadyRecorded = progressionPRs.some(
      (pr) => pr.exerciseId === exerciseId && pr.progressionId === progressionId
    );
    if (alreadyRecorded) continue;

    // Find the highest level previously achieved in this progression
    // by looking at all progression PRs for any exercise in this progression
    const maxPreviousLevel = Math.max(
      0,
      ...progressionPRs.filter((pr) => pr.progressionId === progressionId).map((pr) => pr.value)
    );

    // Also check session history for exercises used in this progression
    // (for cases where no PR was recorded yet but user has used exercises)
    let maxUsedLevel = 0;
    for (const ex of candidateExercises) {
      if (ex.id === exerciseId || !usedExerciseIds.has(ex.id)) continue;
      const exLevel = ex.progressionMemberships?.find((pm) => pm.progressionId === progressionId)?.level ?? 0;
      if (exLevel > maxUsedLevel) maxUsedLevel = exLevel;
    }

    const previousLevel = Math.max(maxPreviousLevel, maxUsedLevel);

    if (level > previousLevel) {
      advancements.push({
        progressionId,
        progressionName: definition.name,
        newLevel: level,
        previousLevel,
      });
    }
  }

  return advancements;
}

/**
 * Save progression advancements as PR records
 */
async function saveProgressionAdvancements(
  advancements: ProgressionAdvancement[],
  exerciseId: string,
  setId: string
): Promise<PR[]> {
  const now = Date.now();
  const savedPRs: PR[] = [];

  for (const advancement of advancements) {
    const pr: PR = {
      id: crypto.randomUUID(),
      exerciseId,
      setId,
      type: 'progression',
      value: advancement.newLevel,
      previousValue: advancement.previousLevel > 0 ? advancement.previousLevel : undefined,
      progressionId: advancement.progressionId,
      achievedAt: now,
      createdAt: now,
    };

    await db.prs.add(pr);
    savedPRs.push(pr);
  }

  return savedPRs;
}

/**
 * Detect and save progression advancements in one operation
 */
export async function detectAndSaveProgressionAdvancements(
  exerciseId: string,
  setId: string
): Promise<PR[]> {
  const advancements = await detectProgressionAdvancements(exerciseId);
  if (advancements.length === 0) return [];
  return saveProgressionAdvancements(advancements, exerciseId, setId);
}

/**
 * Detect progression advancements across every set of an exercise currently being
 * logged in an active session, WITHOUT saving to DB. Used to show live level-up badges.
 *
 * A level-up is an exercise-level event, not a per-set one: it's assigned to the
 * single earliest set with data in this session, not repeated on every set.
 */
export async function previewProgressionAdvancementsForSets(
  sets: Set[],
  exerciseId: string
): Promise<Map<string, PR[]>> {
  const bySet = new Map<string, PR[]>();

  const firstSetWithData = sets.find(
    (set) => !set.isWarmup && (set.weight || set.reps || set.time || set.distance)
  );
  if (!firstSetWithData) return bySet;

  const advancements = await detectProgressionAdvancements(exerciseId);
  if (advancements.length === 0) return bySet;

  const now = Date.now();
  const prs: PR[] = advancements.map((advancement) => ({
    id: `preview-prog-${firstSetWithData.id}-${advancement.progressionId}`,
    exerciseId,
    setId: firstSetWithData.id,
    type: 'progression' as const,
    value: advancement.newLevel,
    previousValue: advancement.previousLevel > 0 ? advancement.previousLevel : undefined,
    progressionId: advancement.progressionId,
    achievedAt: now,
    createdAt: now,
  }));

  bySet.set(firstSetWithData.id, prs);
  return bySet;
}
