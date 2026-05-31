import { db } from '../db';
import type { PR } from '../types';
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
export async function detectProgressionAdvancements(
  exerciseId: string
): Promise<ProgressionAdvancement[]> {
  const exercise = await db.exercises.get(exerciseId);
  if (!exercise?.progressionMemberships?.length) return [];

  const advancements: ProgressionAdvancement[] = [];

  for (const membership of exercise.progressionMemberships) {
    const { progressionId, level } = membership;
    const definition = PROGRESSION_MAP[progressionId];
    if (!definition) continue;

    // Check existing progression PRs for this progression
    const existingProgressionPRs = await db.prs
      .where('exerciseId')
      .equals(exerciseId)
      .filter((pr) => pr.type === 'progression' && pr.progressionId === progressionId)
      .toArray();

    // If we already recorded a PR for this exact exercise + progression, skip
    if (existingProgressionPRs.length > 0) continue;

    // Find the highest level previously achieved in this progression
    // by looking at all progression PRs for any exercise in this progression
    const allProgressionPRs = await db.prs
      .filter((pr) => pr.type === 'progression' && pr.progressionId === progressionId)
      .toArray();

    const maxPreviousLevel = allProgressionPRs.length > 0
      ? Math.max(...allProgressionPRs.map((pr) => pr.value))
      : 0;

    // Also check session history for exercises used in this progression
    // (for cases where no PR was recorded yet but user has used exercises)
    const progressionExercises = await db.exercises
      .filter(
        (e) =>
          !e.isArchived &&
          (e.progressionMemberships?.some((pm) => pm.progressionId === progressionId) ?? false)
      )
      .toArray();

    const sessionExercises = await db.sessionExercises.toArray();
    const usedExerciseIds = new Set(sessionExercises.map((se) => se.exerciseId));

    let maxUsedLevel = 0;
    for (const ex of progressionExercises) {
      if (usedExerciseIds.has(ex.id) && ex.id !== exerciseId) {
        const exLevel =
          ex.progressionMemberships?.find((pm) => pm.progressionId === progressionId)?.level ?? 0;
        if (exLevel > maxUsedLevel) maxUsedLevel = exLevel;
      }
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
export async function saveProgressionAdvancements(
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
 * Detect progression advancements and return as PR objects WITHOUT saving.
 * Used during active workout to show live level-up badges.
 */
export async function detectProgressionAdvancementsPreview(
  exerciseId: string,
  setId: string
): Promise<PR[]> {
  const advancements = await detectProgressionAdvancements(exerciseId);
  if (advancements.length === 0) return [];

  const now = Date.now();
  return advancements.map((advancement) => ({
    id: `preview-prog-${setId}-${advancement.progressionId}`,
    exerciseId,
    setId,
    type: 'progression' as const,
    value: advancement.newLevel,
    previousValue: advancement.previousLevel > 0 ? advancement.previousLevel : undefined,
    progressionId: advancement.progressionId,
    achievedAt: now,
    createdAt: now,
  }));
}
