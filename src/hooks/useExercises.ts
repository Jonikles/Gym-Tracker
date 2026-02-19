import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Exercise, ExerciseField, MuscleGroup } from '../types';
import { matchesAllWords } from '../utils/search';

/**
 * Sort options for exercises
 */
export type ExerciseSortOption = 'name-asc' | 'name-desc' | 'level-asc' | 'level-desc';

/**
 * Filter mode for multi-select filters
 * - 'any': Show exercise if it matches ANY of the selected values
 * - 'all': Show exercise only if it matches ALL of the selected values
 */
export type FilterMode = 'any' | 'all';

/**
 * Filter options for exercise queries
 */
export interface ExerciseFilters {
  muscleGroups?: MuscleGroup[];
  filterMode?: FilterMode;
  equipment?: string;
  movementPattern?: string;
  includeArchived?: boolean;
  searchQuery?: string;
  sort?: ExerciseSortOption;
  progressionId?: string;
}

/**
 * Input for creating a new exercise
 */
export interface CreateExerciseInput {
  name: string;
  parentId?: string;
  muscleGroups?: MuscleGroup[];
  movementPattern?: string;
  equipment?: string;
  defaultFields?: ExerciseField[];
}

/**
 * Input for updating an exercise
 */
export interface UpdateExerciseInput {
  name?: string;
  parentId?: string | null;
  muscleGroups?: MuscleGroup[];
  movementPattern?: string;
  equipment?: string;
  defaultFields?: ExerciseField[];
}

/**
 * Hook for exercise CRUD operations and queries
 */
export function useExercises(filters?: ExerciseFilters) {
  // Query exercises with optional filters
  const exercises = useLiveQuery(async () => {
    let collection = db.exercises.toCollection();

    // Get all exercises first, then filter in memory
    // Dexie doesn't support complex compound queries well
    let results = await collection.toArray();

    // Filter out archived unless explicitly requested
    if (!filters?.includeArchived) {
      results = results.filter((e) => !e.isArchived);
    }

    // Filter by muscle groups (supports multi-select with ANY/ALL modes)
    if (filters?.muscleGroups && filters.muscleGroups.length > 0) {
      const filterMode = filters.filterMode ?? 'any';
      if (filterMode === 'any') {
        // Show exercise if it matches ANY of the selected muscle groups
        results = results.filter((e) =>
          filters.muscleGroups!.some((mg) => e.muscleGroups?.includes(mg))
        );
      } else {
        // Show exercise only if it matches ALL of the selected muscle groups
        results = results.filter((e) =>
          filters.muscleGroups!.every((mg) => e.muscleGroups?.includes(mg))
        );
      }
    }

    // Filter by equipment
    if (filters?.equipment) {
      results = results.filter((e) => e.equipment === filters.equipment);
    }

    // Filter by movement pattern
    if (filters?.movementPattern) {
      results = results.filter(
        (e) => e.movementPattern === filters.movementPattern
      );
    }

      // Search by name (order-independent)
      if (filters?.searchQuery) {
          results = results.filter((e) => matchesAllWords(e.name, filters.searchQuery!));
      }

    // Filter by progression
    if (filters?.progressionId) {
      results = results.filter((e) =>
        e.progressionMemberships?.some((pm) => pm.progressionId === filters.progressionId)
      );
    }

    // Sort
    const sortOption = filters?.sort ?? 'name-asc';
    if (sortOption === 'name-asc') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'name-desc') {
      results.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === 'level-asc') {
      results.sort((a, b) => (a.progressionLevel ?? 999) - (b.progressionLevel ?? 999));
    } else if (sortOption === 'level-desc') {
      results.sort((a, b) => (b.progressionLevel ?? 0) - (a.progressionLevel ?? 0));
    }

    return results;
  }, [
    filters?.muscleGroups?.join(','),
    filters?.filterMode,
    filters?.equipment,
    filters?.movementPattern,
    filters?.includeArchived,
    filters?.searchQuery,
    filters?.sort,
    filters?.progressionId,
  ]);

  return exercises ?? [];
}

/**
 * Hook to get a single exercise by ID
 */
export function useExercise(id: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!id) return undefined;
      return db.exercises.get(id);
    },
    [id]
  );
}

/**
 * Hook to get all variations of a parent exercise
 */
export function useExerciseVariations(parentId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!parentId) return [];
      return db.exercises
        .where('parentId')
        .equals(parentId)
        .filter((e) => !e.isArchived)
        .toArray();
    },
    [parentId]
  );
}

/**
 * Get unique muscle groups from all exercises
 */
export function useUniqueMuscleGroups() {
  return useLiveQuery(async () => {
    const exercises = await db.exercises
      .filter((e) => !e.isArchived)
      .toArray();
    const muscleGroups = new Set<MuscleGroup>();
    exercises.forEach((e) => {
      e.muscleGroups?.forEach((mg) => muscleGroups.add(mg));
    });
    return Array.from(muscleGroups).sort();
  }, []);
}

/**
 * Get unique equipment types from all exercises
 */
export function useUniqueEquipment() {
  return useLiveQuery(async () => {
    const exercises = await db.exercises
      .filter((e) => !e.isArchived)
      .toArray();
    const equipment = new Set<string>();
    exercises.forEach((e) => {
      if (e.equipment) equipment.add(e.equipment);
    });
    return Array.from(equipment).sort();
  }, []);
}

/**
 * Get unique movement patterns from all exercises
 */
export function useUniqueMovementPatterns() {
  return useLiveQuery(async () => {
    const exercises = await db.exercises
      .filter((e) => !e.isArchived)
      .toArray();
    const patterns = new Set<string>();
    exercises.forEach((e) => {
      if (e.movementPattern) patterns.add(e.movementPattern);
    });
    return Array.from(patterns).sort();
  }, []);
}

/**
 * Create a new exercise
 */
export async function createExercise(input: CreateExerciseInput): Promise<string> {
  // Check for duplicate name (case-insensitive, excluding archived)
  const existing = await db.exercises
    .filter((e) => e.name.toLowerCase() === input.name.trim().toLowerCase() && !e.isArchived)
    .first();
  if (existing) {
    throw new Error('An exercise with this name already exists');
  }

  const now = Date.now();
  const exercise: Exercise = {
    id: crypto.randomUUID(),
    name: input.name,
    parentId: input.parentId,
    muscleGroups: input.muscleGroups,
    movementPattern: input.movementPattern,
    equipment: input.equipment,
    defaultFields: input.defaultFields ?? ['weight', 'reps'],
    isPreset: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.exercises.add(exercise);
  return exercise.id;
}

/**
 * Update an existing exercise
 */
export async function updateExercise(
  id: string,
  input: UpdateExerciseInput
): Promise<void> {
  const updates: Partial<Exercise> = {
    updatedAt: Date.now(),
  };

  if (input.name !== undefined) {
    // Check for duplicate name (case-insensitive, excluding self and archived)
    const existing = await db.exercises
      .filter((e) => e.id !== id && e.name.toLowerCase() === input.name!.trim().toLowerCase() && !e.isArchived)
      .first();
    if (existing) {
      throw new Error('An exercise with this name already exists');
    }
    updates.name = input.name;
  }
  if (input.muscleGroups !== undefined) updates.muscleGroups = input.muscleGroups;
  if (input.movementPattern !== undefined) updates.movementPattern = input.movementPattern;
  if (input.equipment !== undefined) updates.equipment = input.equipment;
  if (input.defaultFields !== undefined) updates.defaultFields = input.defaultFields;
  
  // Handle parentId - null means unlink, undefined means no change
  if (input.parentId === null) {
    updates.parentId = undefined;
  } else if (input.parentId !== undefined) {
    updates.parentId = input.parentId;
  }

  await db.exercises.update(id, updates);
}

/**
 * Archive an exercise (soft delete)
 */
export async function archiveExercise(id: string): Promise<void> {
  await db.exercises.update(id, {
    isArchived: true,
    updatedAt: Date.now(),
  });
}

/**
 * Restore an archived exercise
 */
export async function restoreExercise(id: string): Promise<void> {
  await db.exercises.update(id, {
    isArchived: false,
    updatedAt: Date.now(),
  });
}

/**
 * Link an exercise to a parent (for variation grouping)
 */
export async function linkExerciseToParent(
  exerciseId: string,
  parentId: string
): Promise<void> {
  await db.exercises.update(exerciseId, {
    parentId,
    updatedAt: Date.now(),
  });
}

/**
 * Unlink an exercise from its parent
 */
export async function unlinkExerciseFromParent(exerciseId: string): Promise<void> {
  await db.exercises.update(exerciseId, {
    parentId: undefined,
    updatedAt: Date.now(),
  });
}

/**
 * Delete an exercise permanently
 * v1.4: Added for user-created exercises
 */
export async function deleteExercise(id: string): Promise<void> {
  const exercise = await db.exercises.get(id);
  if (!exercise) throw new Error('Exercise not found');
  if (exercise.isPreset) throw new Error('Cannot delete preset exercises');

  // Check if exercise is referenced in any session history
  const sessionRefs = await db.sessionExercises
    .where('exerciseId')
    .equals(id)
    .count();

  // Check if exercise is referenced in any templates
  const templates = await db.templates.toArray();
  const templateRefs = templates.filter((t) =>
    t.exercises.some((e) => e.exerciseId === id)
  ).length;

  if (sessionRefs > 0 || templateRefs > 0) {
    throw new Error(
      `Cannot delete "${exercise.name}" — it is used in ${sessionRefs} session(s) and ${templateRefs} template(s). Archive it instead.`
    );
  }

  // Safe to delete — also clean up any orphaned PRs
  await db.prs.where('exerciseId').equals(id).delete();
  await db.exercises.delete(id);
}

export async function duplicateExercise(id: string): Promise<string> {
    const original = await db.exercises.get(id);
    if (!original) throw new Error('Exercise not found');

    const newId = crypto.randomUUID();
    const now = Date.now();

    await db.exercises.add({
        ...original,
        id: newId,
        name: `${original.name} (Copy)`,
        isPreset: false,
        createdAt: now,
        updatedAt: now,
    });

    return newId;
}