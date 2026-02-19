import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { PROGRESSION_DEFINITIONS } from '../data/progressions';

/**
 * Get all exercises belonging to a specific progression, sorted by level
 */
export function useProgressionExercises(progressionId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!progressionId) return [];
      const exercises = await db.exercises
        .filter(
          (e) =>
            !e.isArchived &&
            (e.progressionMemberships?.some((pm) => pm.progressionId === progressionId) ?? false)
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

    const sessionExercises = await db.sessionExercises.toArray();
    const usedExerciseIds = new Set(sessionExercises.map((se) => se.exerciseId));

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
 * Get progression definitions that actually have exercises in the DB
 */
export function useActiveProgressions() {
  return useLiveQuery(async () => {
    const exercises = await db.exercises
      .filter((e) => !e.isArchived && e.progressionMemberships !== undefined)
      .toArray();

    const ids = new Set<string>();
    exercises.forEach((e) => {
      e.progressionMemberships?.forEach((pm) => ids.add(pm.progressionId));
    });

    return PROGRESSION_DEFINITIONS.filter((p) => ids.has(p.id));
  }, []);
}
