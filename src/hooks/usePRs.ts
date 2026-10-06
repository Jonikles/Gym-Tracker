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
 * Hook to get all PRs for a session in one batched query
 * (one live query per session instead of one per set)
 */
export function usePRsForSession(sessionId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!sessionId) return [];

      return loadPRsForSession(sessionId);
    },
    [sessionId]
  );
}

/** All PRs earned by a session's sets — three indexed queries, no per-set loops */
async function loadPRsForSession(sessionId: string): Promise<PR[]> {
  const seIds = (await db.sessionExercises
    .where('sessionId')
    .equals(sessionId)
    .primaryKeys()) as string[];
  if (seIds.length === 0) return [];

  const setIds = (await db.sets
    .where('sessionExerciseId')
    .anyOf(seIds)
    .primaryKeys()) as string[];
  if (setIds.length === 0) return [];

  return db.prs.where('setId').anyOf(setIds).toArray();
}

