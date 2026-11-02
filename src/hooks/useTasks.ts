import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Task } from '../types';

export interface TaskFilters {
  showCompleted?: boolean;
  sessionId?: string;
  exerciseId?: string;
  dueExerciseId?: string;
}

export function useTasks(filters?: TaskFilters) {
  return useLiveQuery(async () => {
    let results = await db.tasks.toArray();

    // Filter by completion status
    if (!filters?.showCompleted) {
      results = results.filter((t) => !t.isCompleted);
    }

    // Filter by session
    if (filters?.sessionId) {
      results = results.filter((t) => t.sessionId === filters.sessionId);
    }

    // Filter by related exercise
    if (filters?.exerciseId) {
      results = results.filter((t) => t.exerciseId === filters.exerciseId);
    }

    // Filter by due exercise (for showing reminders during workout)
    if (filters?.dueExerciseId) {
      results = results.filter((t) => t.dueExerciseId === filters.dueExerciseId);
    }

    // Sort: incomplete first, then by createdAt descending
    results.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return b.createdAt - a.createdAt;
    });

    return results;
  }, [filters?.showCompleted, filters?.sessionId, filters?.exerciseId, filters?.dueExerciseId]) ?? [];
}

/**
 * Get tasks due for any of the given exercise IDs (for workout reminders)
 */
export function useTasksDueForExercises(exerciseIds: string[]) {
  return useLiveQuery(async () => {
    if (exerciseIds.length === 0) return [];

    const dueTasks = await db.tasks.where('dueExerciseId').anyOf(exerciseIds).toArray();

    // Booleans aren't indexable in IndexedDB, so completion is filtered here
    return dueTasks.filter((t) =>
      !t.isCompleted &&
      t.dueExerciseId &&
      exerciseIds.includes(t.dueExerciseId)
    );
  }, [exerciseIds.join(',')]) ?? [];
}

export function useTask(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return undefined;
    return db.tasks.get(id);
  }, [id]);
}

export async function createTask(input: {
  text: string;
  sessionId?: string;
  exerciseId?: string;
  dueExerciseId?: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.tasks.add({
    id,
    text: input.text.trim(),
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    dueExerciseId: input.dueExerciseId,
    isCompleted: false,
    createdAt: now,
  });

  return id;
}

export async function completeTask(id: string): Promise<void> {
  await db.tasks.update(id, {
    isCompleted: true,
    completedAt: Date.now(),
  });
}

export async function uncompleteTask(id: string): Promise<void> {
  await db.tasks.update(id, {
    isCompleted: false,
    completedAt: undefined,
  });
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}

export async function updateTask(id: string, updates: Partial<Pick<Task, 'text' | 'dueExerciseId'>>): Promise<void> {
  const updateObj: Partial<Task> = {};
  if (updates.text !== undefined) updateObj.text = updates.text.trim();
  if (updates.dueExerciseId !== undefined) updateObj.dueExerciseId = updates.dueExerciseId;
  await db.tasks.update(id, updateObj);
}
