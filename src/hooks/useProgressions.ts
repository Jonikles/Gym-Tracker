import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Exercise } from '../types';
import { findLatestCompletedSessionExercise } from '../utils/session';

/**
 * Get all exercises belonging to a specific progression, sorted by level
 */
export function useProgressionExercises(progressionId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!progressionId) return [];
      const exercises = await db.exercises
        .filter(
          (e) => e.progressionMemberships?.some((pm) => pm.progressionId === progressionId) ?? false
        )
        .toArray();

      return exercises.sort((a, b) => {
        const aLevel =
          a.progressionMemberships?.find((pm) => pm.progressionId === progressionId)?.level ?? 0;
        const bLevel =
          b.progressionMemberships?.find((pm) => pm.progressionId === progressionId)?.level ?? 0;
        return aLevel - bLevel;
      });
    },
    [progressionId]
  );
}

/**
 * Get user's highest achieved level per progression (based on session history)
 */
export function useProgressionAchievements() {
  return useLiveQuery(async () => {
    const achievements: Record<string, number> = {};

    const exercises = await db.exercises
      .filter((e) => e.progressionMemberships !== undefined && e.progressionMemberships.length > 0)
      .toArray();

    // Which progression exercises have been used — indexed lookup on exerciseId
    // (keys only) instead of loading the whole sessionExercises table
    const usedExerciseIds = new Set(
      exercises.length > 0
        ? ((await db.sessionExercises
            .where('exerciseId')
            .anyOf(exercises.map((e) => e.id))
            .keys()) as string[])
        : []
    );

    for (const exercise of exercises) {
      if (!usedExerciseIds.has(exercise.id)) continue;

      for (const pm of exercise.progressionMemberships ?? []) {
        const current = achievements[pm.progressionId] ?? 0;
        if (pm.level > current) {
          achievements[pm.progressionId] = pm.level;
        }
      }
    }

    return achievements;
  }, []);
}

/**
 * Get the last-used exercise for a progression slot.
 * Checks sessionExercises with matching progressionId from the most recent completed session.
 * Falls back to checking by exerciseId against all exercises in the progression (pre-v5 data).
 * Returns undefined if no history — caller should default to lowest level.
 */
export async function getLastUsedExerciseForProgression(
  progressionId: string
): Promise<Exercise | undefined> {
  // Strategy 1: Direct lookup via progressionId index (v5+ data)
  const sessionExercises = await db.sessionExercises
    .where('progressionId')
    .equals(progressionId)
    .toArray();

  const lastSE = await findLatestCompletedSessionExercise(sessionExercises);
  if (lastSE) {
    return db.exercises.get(lastSE.exerciseId);
  }

  // Strategy 2: Fallback for pre-v5 data — find exercises in this progression
  // that were used in any completed session
  const progressionExercises = await db.exercises
    .filter(
      (e) => e.progressionMemberships?.some((pm) => pm.progressionId === progressionId) ?? false
    )
    .toArray();

  if (progressionExercises.length === 0) return undefined;

  const exerciseIds = new Set(progressionExercises.map((e) => e.id));

  // Find all session exercises matching any exercise in this progression
  const allSE = await db.sessionExercises
    .where('exerciseId')
    .anyOf([...exerciseIds])
    .toArray();

  const lastUsedSE = await findLatestCompletedSessionExercise(allSE);
  if (!lastUsedSE) return undefined;

  return progressionExercises.find((e) => e.id === lastUsedSE.exerciseId);
}

/**
 * Get the lowest-level exercise in a progression (fallback when no history exists)
 */
export async function getLowestLevelExercise(
  progressionId: string
): Promise<Exercise | undefined> {
  const exercises = await db.exercises
    .filter(
      (e) => e.progressionMemberships?.some((pm) => pm.progressionId === progressionId) ?? false
    )
    .toArray();

  if (exercises.length === 0) return undefined;

  return exercises.sort((a, b) => {
    const aLevel =
      a.progressionMemberships?.find((pm) => pm.progressionId === progressionId)?.level ?? 0;
    const bLevel =
      b.progressionMemberships?.find((pm) => pm.progressionId === progressionId)?.level ?? 0;
    return aLevel - bLevel;
  })[0];
}
