import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export interface ProgressionHistoryEntry {
  date: number; // session startedAt
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  level: number;
}

/**
 * Get the usage history of a progression — which exercise/level was used in each session.
 * Works with both v5+ data (progressionId on sessionExercise) and pre-v5 data
 * (matching by exercise memberships).
 */
export function useProgressionHistory(progressionId: string): ProgressionHistoryEntry[] | undefined {
  return useLiveQuery(async () => {
    // Get all exercises that belong to this progression
    const allExercises = await db.exercises
      .filter(
        (e) =>
          e.progressionMemberships?.some((pm) => pm.progressionId === progressionId) ?? false
      )
      .toArray();

    if (allExercises.length === 0) return [];

    const exerciseMap = new Map(allExercises.map((e) => [e.id, e]));
    const exerciseIds = new Set(allExercises.map((e) => e.id));

    // Strategy 1: Find via progressionId index (v5+ data)
    const v5Matches = await db.sessionExercises
      .where('progressionId')
      .equals(progressionId)
      .toArray();

    // Strategy 2: Find via exerciseId match (pre-v5 data)
    const allSE = await db.sessionExercises
      .filter((se) => exerciseIds.has(se.exerciseId) && !se.progressionId)
      .toArray();

    const combined = [...v5Matches, ...allSE];
    if (combined.length === 0) return [];

    // Get sessions for dates
    const sessionIds = [...new Set(combined.map((se) => se.sessionId))];
    const sessions = await db.sessions.bulkGet(sessionIds);
    const sessionMap = new Map(
      sessions.filter((s) => s != null && s.completedAt != null).map((s) => [s!.id, s!])
    );

    const entries: ProgressionHistoryEntry[] = [];

    for (const se of combined) {
      const session = sessionMap.get(se.sessionId);
      if (!session) continue;

      const exercise = exerciseMap.get(se.exerciseId);
      if (!exercise) continue;

      const membership = exercise.progressionMemberships?.find(
        (pm) => pm.progressionId === progressionId
      );
      if (!membership) continue;

      entries.push({
        date: session.startedAt,
        sessionId: session.id,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        level: membership.level,
      });
    }

    // Sort newest first
    entries.sort((a, b) => b.date - a.date);

    return entries;
  }, [progressionId]);
}
