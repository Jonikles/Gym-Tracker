import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { calculateE1RM, isE1RMValid } from '../utils/e1rm';
import { getSetVolume, getPrimaryWeightAndReps, isE1RMEligible } from '../utils/volume';
import type { Set } from '../types';

/**
 * Data point for charts
 */
export interface ChartDataPoint {
  date: number;
  value: number;
  sessionId: string;
}

/**
 * Get exercise history data for charts
 */
export function useExerciseHistory(
  exerciseId: string | undefined,
  options?: {
    includeWarmups?: boolean;
    includeParentVariations?: boolean;
    startDate?: number;
    endDate?: number;
  }
) {
  return useLiveQuery(
    async () => {
      if (!exerciseId) return null;

      // Get exercise IDs to include
      let exerciseIds = [exerciseId];

      if (options?.includeParentVariations) {
        // Get the exercise to find parent
        const exercise = await db.exercises.get(exerciseId);
        if (exercise?.parentId) {
          // Include parent and all its variations
          const siblings = await db.exercises
            .where('parentId')
            .equals(exercise.parentId)
            .toArray();
          exerciseIds = [exercise.parentId, ...siblings.map((s) => s.id)];
        } else {
          // This might be a parent - get all variations
          const variations = await db.exercises
            .where('parentId')
            .equals(exerciseId)
            .toArray();
          exerciseIds = [exerciseId, ...variations.map((v) => v.id)];
        }
      }

      // Get all session exercises for these exercises
      const allSessionExercises = await db.sessionExercises
        .where('exerciseId')
        .anyOf(exerciseIds)
        .toArray();

      if (allSessionExercises.length === 0) return null;

      // Get sessions for filtering by date and getting timestamps
      const sessionIds = [...new Set(allSessionExercises.map((se) => se.sessionId))];
      const sessions = await db.sessions.bulkGet(sessionIds);
      const sessionMap = new Map(sessions.filter(Boolean).map((s) => [s!.id, s!]));

      // Filter by completed sessions only and date range
      const validSessionExercises = allSessionExercises.filter((se) => {
        const session = sessionMap.get(se.sessionId);
        if (!session || !session.completedAt) return false;
        if (options?.startDate && session.startedAt < options.startDate) return false;
        if (options?.endDate && session.startedAt > options.endDate) return false;
        return true;
      });

      // Get all sets
      const allSets: { set: Set; sessionDate: number; sessionId: string }[] = [];
      const fetchedSets = validSessionExercises.length > 0
        ? await db.sets
          .where('sessionExerciseId')
          .anyOf(validSessionExercises.map((se) => se.id))
          .toArray()
        : [];
      const setsBySE = new Map<string, Set[]>();
      for (const set of fetchedSets) {
        const list = setsBySE.get(set.sessionExerciseId) ?? [];
        list.push(set);
        setsBySE.set(set.sessionExerciseId, list);
      }
      for (const se of validSessionExercises) {
        const sets = setsBySE.get(se.id) ?? [];
        const session = sessionMap.get(se.sessionId)!;
        for (const set of sets) {
          if (!options?.includeWarmups && set.isWarmup) continue;
          allSets.push({
            set,
            sessionDate: session.startedAt,
            sessionId: session.id,
          });
        }
      }

      // Calculate metrics per session
      const sessionData = new Map<string, {
        date: number;
        maxWeight: number;
        maxReps: number;
        maxE1RM: number;
        totalVolume: number;
        setCount: number;
      }>();

      for (const { set, sessionDate, sessionId } of allSets) {
        const existing = sessionData.get(sessionId) ?? {
          date: sessionDate,
          maxWeight: 0,
          maxReps: 0,
          maxE1RM: 0,
          totalVolume: 0,
          setCount: 0,
        };

        // Get primary weight/reps (for partials, uses main set only)
        const { weight, reps } = getPrimaryWeightAndReps(set);

        existing.maxWeight = Math.max(existing.maxWeight, weight);
        existing.maxReps = Math.max(existing.maxReps, reps);
        
        // Use technique-aware volume calculation
        existing.totalVolume += getSetVolume(set);
        existing.setCount += 1;

        // Only calculate e1RM for eligible techniques
        if (weight > 0 && reps > 0 && isE1RMValid(reps) && isE1RMEligible(set.intensityTechnique)) {
          const e1rm = calculateE1RM(weight, reps);
          existing.maxE1RM = Math.max(existing.maxE1RM, e1rm);
        }

        sessionData.set(sessionId, existing);
      }

      // Convert to arrays sorted by date
      const dataArray = Array.from(sessionData.entries())
        .map(([sessionId, data]) => ({ sessionId, ...data }))
        .sort((a, b) => a.date - b.date);

      return {
        weightOverTime: dataArray.map((d) => ({
          date: d.date,
          value: d.maxWeight,
          sessionId: d.sessionId,
        })),
        volumeOverTime: dataArray.map((d) => ({
          date: d.date,
          value: d.totalVolume,
          sessionId: d.sessionId,
        })),
        e1rmOverTime: dataArray
          .filter((d) => d.maxE1RM > 0)
          .map((d) => ({
            date: d.date,
            value: d.maxE1RM,
            sessionId: d.sessionId,
          })),
        totalSessions: dataArray.length,
        totalSets: allSets.length,
      };
    },
    [exerciseId, options?.includeWarmups, options?.includeParentVariations, options?.startDate, options?.endDate]
  );
}

/**
 * Get all exercises with their session counts (for progress list)
 */
export function useExercisesWithHistory() {
  return useLiveQuery(async () => {
    // One read of sessionExercises + one bulkGet of their sessions, grouped in
    // memory — instead of ~2 queries per exercise in the library.
    const sessionExercises = await db.sessionExercises.toArray();
    if (sessionExercises.length === 0) return [];

    const sessionIds = [...new globalThis.Set(sessionExercises.map((se) => se.sessionId))];
    const sessions = await db.sessions.bulkGet(sessionIds);
    const completedSessionIds = new globalThis.Set(
      sessions.filter((s) => s?.completedAt).map((s) => s!.id)
    );

    // exerciseId -> unique completed sessions it appeared in
    const sessionsByExercise = new Map<string, globalThis.Set<string>>();
    for (const se of sessionExercises) {
      if (!completedSessionIds.has(se.sessionId)) continue;
      let ids = sessionsByExercise.get(se.exerciseId);
      if (!ids) {
        ids = new globalThis.Set<string>();
        sessionsByExercise.set(se.exerciseId, ids);
      }
      ids.add(se.sessionId);
    }
    if (sessionsByExercise.size === 0) return [];

    const exercises = await db.exercises.bulkGet([...sessionsByExercise.keys()]);
    const result = [];
    for (const exercise of exercises) {
      if (!exercise) continue;
      result.push({
        exercise,
        sessionCount: sessionsByExercise.get(exercise.id)!.size,
      });
    }

    return result.sort((a, b) => b.sessionCount - a.sessionCount);
  }, []);
}
