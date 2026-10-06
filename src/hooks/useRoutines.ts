import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Routine, RoutineDay, RoutineType } from '../types';
import { matchesAllWords } from '../utils/search';
import { useToday } from './useToday';

/**
 * Filter options for routine queries
 */
export interface RoutineFilters {
  type?: RoutineType;
  searchQuery?: string;
}

/**
 * Input for creating a new routine
 */
export interface CreateRoutineInput {
  name: string;
  type: RoutineType;
  schedule?: RoutineDay[];
}

/**
 * Input for updating a routine
 */
export interface UpdateRoutineInput {
  name?: string;
  type?: RoutineType;
  schedule?: RoutineDay[];
  currentPosition?: number;
}

/**
 * Hook for routine queries with optional filters
 */
export function useRoutines(filters?: RoutineFilters) {
  const routines = useLiveQuery(async () => {
    let results = await db.routines.toArray();

    // Filter by type
    if (filters?.type) {
      results = results.filter((r) => r.type === filters.type);
    }

      // Search by name (order-independent)
      if (filters?.searchQuery) {
          results = results.filter((r) => matchesAllWords(r.name, filters.searchQuery!));
      }

    // Sort by name
    results.sort((a, b) => a.name.localeCompare(b.name));

    return results;
  }, [filters?.type, filters?.searchQuery]);

  return routines ?? [];
}

/**
 * Hook to get a single routine by ID
 */
export function useRoutine(id: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!id) return undefined;
      return db.routines.get(id);
    },
    [id]
  );
}

/**
 * Get today's scheduled template from the ACTIVE routine (the `activeRoutineId`
 * setting). Fixed routines use today's weekday; rolling routines use their
 * current position. Returns undefined when no routine is active, today is a
 * rest day, or the scheduled template no longer exists.
 *
 * `weekStartDay` doesn't affect which template is picked (schedule days are
 * keyed by real weekday); it's kept as a parameter for API compatibility.
 * Recomputes when the date changes (via useToday).
 */
export function useTodaysTemplate(weekStartDay: number = 0) {
  const today = useToday();
  return useLiveQuery(async () => {
    const activeSetting = await db.settings.get('activeRoutineId');
    const activeRoutineId = activeSetting?.value;
    if (typeof activeRoutineId !== 'string' || !activeRoutineId) return undefined;

    const routine = await db.routines.get(activeRoutineId);
    if (!routine) return undefined;

    let scheduleDay: RoutineDay | undefined;
    if (routine.type === 'fixed') {
      const dayOfWeek = new Date(today).getDay(); // 0 = Sunday
      scheduleDay = routine.schedule.find((s) => s.dayIndex === dayOfWeek);
    } else {
      const len = routine.schedule.length;
      scheduleDay = len > 0 ? routine.schedule[(routine.currentPosition ?? 0) % len] : undefined;
    }

    if (!scheduleDay?.templateId) return undefined;
    const template = await db.templates.get(scheduleDay.templateId);
    if (!template) return undefined;
    return { routine, template, scheduleDay };
  }, [weekStartDay, today]);
}

/**
 * Create a new routine
 */
export async function createRoutine(input: CreateRoutineInput): Promise<string> {
  // Check for duplicate name
  const existing = await db.routines
    .filter((r) => r.name.toLowerCase() === input.name.trim().toLowerCase())
    .first();
  
  if (existing) {
    throw new Error('A routine with this name already exists');
  }

  const now = Date.now();

  // Default schedule based on type
  let schedule = input.schedule ?? [];
  if (schedule.length === 0) {
    if (input.type === 'fixed') {
      // Create empty 7-day schedule (Sun-Sat)
      schedule = Array.from({ length: 7 }, (_, i) => ({ dayIndex: i }));
    } else {
      // Create empty 3-day rolling schedule
      schedule = Array.from({ length: 3 }, (_, i) => ({ dayIndex: i }));
    }
  }

  const routine: Routine = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    type: input.type,
    schedule,
    currentPosition: input.type === 'rolling' ? 0 : undefined,
    createdAt: now,
    updatedAt: now,
  };

  await db.routines.add(routine);
  return routine.id;
}

/**
 * Update an existing routine (rejects renaming to a duplicate name)
 */
export async function updateRoutine(
  id: string,
  input: UpdateRoutineInput
): Promise<void> {
  // If name is being changed, check for duplicates
  if (input.name !== undefined) {
    const existing = await db.routines
      .filter(
        (r) =>
          r.id !== id &&
          r.name.toLowerCase() === input.name!.trim().toLowerCase()
      )
      .first();

    if (existing) {
      throw new Error('A routine with this name already exists');
    }
  }

  const updates: Partial<Routine> = {
    updatedAt: Date.now(),
  };

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.type !== undefined) updates.type = input.type;
  if (input.schedule !== undefined) updates.schedule = input.schedule;
  if (input.currentPosition !== undefined) updates.currentPosition = input.currentPosition;

  await db.routines.update(id, updates);
}

/**
 * Duplicate a routine
 */
export async function duplicateRoutine(id: string): Promise<string> {
  const original = await db.routines.get(id);
  if (!original) throw new Error('Routine not found');

  const now = Date.now();

  const duplicate: Routine = {
    ...original,
    id: crypto.randomUUID(),
    name: `${original.name} (Copy)`,
    currentPosition: original.type === 'rolling' ? 0 : undefined,
    createdAt: now,
    updatedAt: now,
  };

  await db.routines.add(duplicate);
  return duplicate.id;
}

/**
 * Advance rolling routine position after completing a workout
 */
export async function advanceRollingPosition(routineId: string): Promise<void> {
  const routine = await db.routines.get(routineId);
  if (!routine || routine.type !== 'rolling') return;

  const currentPos = routine.currentPosition ?? 0;
  const scheduleLength = routine.schedule.length;
  const nextPos = (currentPos + 1) % scheduleLength;

  await db.routines.update(routineId, {
    currentPosition: nextPos,
    updatedAt: Date.now(),
  });
}

/**
 * Delete a routine permanently
 */
export async function deleteRoutine(id: string): Promise<void> {
  await db.routines.delete(id);
}
