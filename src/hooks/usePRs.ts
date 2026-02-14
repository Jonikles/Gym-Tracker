import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { PR, PRType } from '../types';

/**
 * Hook to get PRs for an exercise
 */
export function usePRsForExercise(exerciseId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!exerciseId) return [];
      return db.prs
        .where('exerciseId')
        .equals(exerciseId)
        .toArray()
        .then((prs) => prs.sort((a, b) => b.achievedAt - a.achievedAt));
    },
    [exerciseId]
  );
}

/**
 * Hook to get the current best PR of each type for an exercise
 */
export function useCurrentPRs(exerciseId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!exerciseId) return null;

      const prs = await db.prs
        .where('exerciseId')
        .equals(exerciseId)
        .toArray();

      const current: Partial<Record<PRType, PR>> = {};

      for (const pr of prs) {
        const existing = current[pr.type];
        if (!existing || pr.value > existing.value) {
          current[pr.type] = pr;
        }
      }

      return current;
    },
    [exerciseId]
  );
}

/**
 * Hook to get recent PRs across all exercises
 */
export function useRecentPRs(limit: number = 10) {
  return useLiveQuery(async () => {
    const prs = await db.prs.toArray();
    return prs
      .sort((a, b) => b.achievedAt - a.achievedAt)
      .slice(0, limit);
  }, [limit]);
}

/**
 * Hook to get PRs for a specific set
 */
export function usePRsForSet(setId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!setId) return [];
      return db.prs
        .where('setId')
        .equals(setId)
        .toArray();
    },
    [setId]
  );
}

/**
 * Hook to get all PRs for a session (batched query)
 * v1.4.1: Fix for history page going blank due to too many useLiveQuery hooks
 */
export function usePRsForSession(sessionId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!sessionId) return [];

      // Get all session exercises
      const sessionExercises = await db.sessionExercises
        .where('sessionId')
        .equals(sessionId)
        .toArray();

      // Get all sets for those exercises
      const setIds: string[] = [];
      for (const se of sessionExercises) {
        const sets = await db.sets
          .where('sessionExerciseId')
          .equals(se.id)
          .toArray();
        setIds.push(...sets.map((s) => s.id));
      }

      // Get all PRs for those sets
      const allPRs: PR[] = [];
      for (const setId of setIds) {
        const prs = await db.prs.filter((pr) => pr.setId === setId).toArray();
        allPRs.push(...prs);
      }

      return allPRs;
    },
    [sessionId]
  );
}

/**
 * Get PRs achieved in a session
 */
export async function getPRsForSession(sessionId: string): Promise<PR[]> {
  // Get all session exercises
  const sessionExercises = await db.sessionExercises
    .where('sessionId')
    .equals(sessionId)
    .toArray();

  // Get all sets for those exercises
  const allPRs: PR[] = [];
  for (const se of sessionExercises) {
    const sets = await db.sets
      .where('sessionExerciseId')
      .equals(se.id)
      .toArray();

    for (const set of sets) {
      const prs = await db.prs
        .where('setId')
        .equals(set.id)
        .toArray();
      allPRs.push(...prs);
    }
  }

  return allPRs.sort((a, b) => b.achievedAt - a.achievedAt);
}
