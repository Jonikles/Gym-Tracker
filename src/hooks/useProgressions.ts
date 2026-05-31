import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { PROGRESSION_DEFINITIONS } from '../data/progressions';
import type { Exercise } from '../types';

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

  if (sessionExercises.length > 0) {
    // Get the sessions to find the most recent completed one
    const sessionIds = [...new Set(sessionExercises.map((se) => se.sessionId))];
    const sessions = await db.sessions.bulkGet(sessionIds);

    const completedSessions = sessions
      .filter((s) => s != null && s.completedAt != null)
      .sort((a, b) => b!.startedAt - a!.startedAt);

    if (completedSessions.length > 0) {
      const lastSession = completedSessions[0]!;
      const lastSE = sessionExercises.find((se) => se.sessionId === lastSession.id);
      if (lastSE) {
        return db.exercises.get(lastSE.exerciseId);
      }
    }
  }

  // Strategy 2: Fallback for pre-v5 data — find exercises in this progression
  // that were used in any completed session
  const progressionExercises = await db.exercises
    .filter(
      (e) =>
        !e.isArchived &&
        (e.progressionMemberships?.some((pm) => pm.progressionId === progressionId) ?? false)
    )
    .toArray();

  if (progressionExercises.length === 0) return undefined;

  const exerciseIds = new Set(progressionExercises.map((e) => e.id));

  // Find all session exercises matching any exercise in this progression
  const allSE = await db.sessionExercises
    .filter((se) => exerciseIds.has(se.exerciseId))
    .toArray();

  if (allSE.length === 0) return undefined;

  const seSessionIds = [...new Set(allSE.map((se) => se.sessionId))];
  const seSessions = await db.sessions.bulkGet(seSessionIds);

  const completedSE = seSessions
    .filter((s) => s != null && s.completedAt != null)
    .sort((a, b) => b!.startedAt - a!.startedAt);

  if (completedSE.length === 0) return undefined;

  const lastSession = completedSE[0]!;
  const lastUsedSE = allSE.find((se) => se.sessionId === lastSession.id);
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
      (e) =>
        !e.isArchived &&
        (e.progressionMemberships?.some((pm) => pm.progressionId === progressionId) ?? false)
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
