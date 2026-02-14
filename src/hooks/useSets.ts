import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Set, IntensityTechnique, TechniqueData, TemplateExercise } from '../types';

/**
 * Input for creating a new set
 */
export interface CreateSetInput {
  sessionExerciseId: string;
  weight?: number;
  reps?: number;
  isWarmup?: boolean;
  intensityTechnique?: IntensityTechnique;
  techniqueData?: TechniqueData;
}

/**
 * Input for updating a set
 */
export interface UpdateSetInput {
  weight?: number;
  reps?: number;
  isWarmup?: boolean;
  intensityTechnique?: IntensityTechnique;
  techniqueData?: TechniqueData;
}

/**
 * Hook to get sets for a session exercise
 */
export function useSets(sessionExerciseId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!sessionExerciseId) return [];
      const sets = await db.sets
        .where('sessionExerciseId')
        .equals(sessionExerciseId)
        .toArray();
      return sets.sort((a, b) => a.order - b.order);
    },
    [sessionExerciseId]
  );
}

/**
 * Hook to get all sets for a session (across all exercises)
 */
export function useSessionSets(sessionId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!sessionId) return [];
      
      // Get all session exercises first
      const sessionExercises = await db.sessionExercises
        .where('sessionId')
        .equals(sessionId)
        .toArray();
      
      const sessionExerciseIds = sessionExercises.map((se) => se.id);
      
      // Get all sets for these exercises
      const allSets: Set[] = [];
      for (const seId of sessionExerciseIds) {
        const sets = await db.sets
          .where('sessionExerciseId')
          .equals(seId)
          .toArray();
        allSets.push(...sets);
      }
      
      return allSets;
    },
    [sessionId]
  );
}

/**
 * Get previous sets for an exercise (from last completed session)
 */
export async function getPreviousSets(exerciseId: string): Promise<Set[]> {
  // Find the last completed session that has this exercise
  const sessionExercises = await db.sessionExercises
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();

  if (sessionExercises.length === 0) return [];

  // Get the sessions
  const sessionIds = [...new Set(sessionExercises.map((se) => se.sessionId))];
  const sessions = await db.sessions.bulkGet(sessionIds);

  // Filter to completed sessions and sort by date
  const completedSessions = sessions
    .filter((s) => s && s.completedAt != null)
    .sort((a, b) => b!.startedAt - a!.startedAt);

  if (completedSessions.length === 0) return [];

  // Get the session exercise from the most recent completed session
  const lastSession = completedSessions[0]!;
  const lastSessionExercise = sessionExercises.find(
    (se) => se.sessionId === lastSession.id
  );

  if (!lastSessionExercise) return [];

  // Get sets for that session exercise
  const sets = await db.sets
    .where('sessionExerciseId')
    .equals(lastSessionExercise.id)
    .toArray();

  return sets.sort((a, b) => a.order - b.order);
}

/**
 * Create a new set
 */
export async function createSet(input: CreateSetInput): Promise<string> {
  // Get existing sets to determine order
  const existingSets = await db.sets
    .where('sessionExerciseId')
    .equals(input.sessionExerciseId)
    .toArray();

  const maxOrder = Math.max(0, ...existingSets.map((s) => s.order));

  const set: Set = {
    id: crypto.randomUUID(),
    sessionExerciseId: input.sessionExerciseId,
    order: maxOrder + 1,
    weight: input.weight,
    reps: input.reps,
    isWarmup: input.isWarmup ?? false,
    intensityTechnique: input.intensityTechnique ?? 'standard',
    techniqueData: input.techniqueData,
    createdAt: Date.now(),
  };

  await db.sets.add(set);
  return set.id;
}

/**
 * Update an existing set
 */
export async function updateSet(
  setId: string,
  input: UpdateSetInput
): Promise<void> {
  const updates: Partial<Set> = {};

  if (input.weight !== undefined) updates.weight = input.weight;
  if (input.reps !== undefined) updates.reps = input.reps;
  if (input.isWarmup !== undefined) updates.isWarmup = input.isWarmup;
  if (input.intensityTechnique !== undefined) updates.intensityTechnique = input.intensityTechnique;
  if (input.techniqueData !== undefined) updates.techniqueData = input.techniqueData;

  await db.sets.update(setId, updates);
}

/**
 * Delete a set
 */
export async function deleteSet(setId: string): Promise<void> {
  await db.sets.delete(setId);
}

/**
 * Quick-fill sets from previous session
 */
export async function quickFillFromPrevious(
  sessionExerciseId: string,
  exerciseId: string
): Promise<void> {
  const previousSets = await getPreviousSets(exerciseId);
  
  if (previousSets.length === 0) return;

  // Delete any existing sets
  const existingSets = await db.sets
    .where('sessionExerciseId')
    .equals(sessionExerciseId)
    .toArray();
  await db.sets.bulkDelete(existingSets.map((s) => s.id));

  // Create new sets based on previous
  const newSets: Set[] = previousSets.map((prev, index) => ({
    id: crypto.randomUUID(),
    sessionExerciseId,
    order: index + 1,
    weight: prev.weight,
    reps: prev.reps,
    isWarmup: prev.isWarmup,
    intensityTechnique: prev.intensityTechnique,
    techniqueData: prev.techniqueData,
    createdAt: Date.now(),
  }));

  await db.sets.bulkAdd(newSets);
}

/**
 * Create sets based on template exercise config
 * Note: This is now handled in useSessions.ts startSessionFromTemplate()
 * which pre-creates sets with the proper structure
 */
export async function createSetsFromTemplate(
  sessionExerciseId: string,
  templateExercise: TemplateExercise
): Promise<void> {
  const now = Date.now();

  const sets: Set[] = templateExercise.sets.map((ts, index) => ({
    id: crypto.randomUUID(),
    sessionExerciseId,
    order: index,
    weight: templateExercise.weight,
    reps: undefined,
    targetReps: templateExercise.targetReps,
    isWarmup: ts.isWarmup,
    intensityTechnique: ts.intensityTechnique,
    createdAt: now,
  }));

  await db.sets.bulkAdd(sets);
}
