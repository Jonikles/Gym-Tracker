import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Routine, RoutineDay, RoutineType } from '../types';
import { matchesAllWords } from '../utils/search';

/**
 * Filter options for routine queries
 */
export interface RoutineFilters {
  type?: RoutineType;
  includeArchived?: boolean;
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

    // Filter out archived unless explicitly requested
    if (!filters?.includeArchived) {
      results = results.filter((r) => !r.isArchived);
    }

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
  }, [filters?.type, filters?.includeArchived, filters?.searchQuery]);

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
 * Get the template for today based on active routines
 * Takes weekStartDay setting into account
 */
export function useTodaysTemplate(weekStartDay: number = 0) {
  return useLiveQuery(async () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday

    // Check fixed routines first
    const fixedRoutines = await db.routines
      .filter((r) => r.type === 'fixed' && !r.isArchived)
      .toArray();

    for (const routine of fixedRoutines) {
      const todaySchedule = routine.schedule.find((s) => s.dayIndex === dayOfWeek);
      if (todaySchedule?.templateId) {
        const template = await db.templates.get(todaySchedule.templateId);
        if (template && !template.isArchived) {
          return { routine, template, scheduleDay: todaySchedule };
        }
      }
    }

    // Check rolling routines
    const rollingRoutines = await db.routines
      .filter((r) => r.type === 'rolling' && !r.isArchived)
      .toArray();

    if (rollingRoutines.length > 0) {
      // Get the first rolling routine (user should ideally have one)
      const routine = rollingRoutines[0];
      const currentPos = routine.currentPosition ?? 0;
      const scheduleDay = routine.schedule[currentPos];

      if (scheduleDay?.templateId) {
        const template = await db.templates.get(scheduleDay.templateId);
        if (template && !template.isArchived) {
          return { routine, template, scheduleDay };
        }
      }
    }

    return undefined;
  }, [weekStartDay]);
}

/**
 * Get templates scheduled for a specific day of the week
 */
export function useScheduleForDay(dayOfWeek: number) {
  return useLiveQuery(async () => {
    const fixedRoutines = await db.routines
      .filter((r) => r.type === 'fixed' && !r.isArchived)
      .toArray();

    const results: Array<{ routine: Routine; scheduleDay: RoutineDay; templateName?: string }> = [];

    for (const routine of fixedRoutines) {
      const daySchedule = routine.schedule.find((s) => s.dayIndex === dayOfWeek);
      if (daySchedule) {
        let templateName: string | undefined;
        if (daySchedule.templateId) {
          const template = await db.templates.get(daySchedule.templateId);
          templateName = template?.name;
        }
        results.push({ routine, scheduleDay: daySchedule, templateName });
      }
    }

    return results;
  }, [dayOfWeek]);
}

/**
 * Create a new routine
 */
export async function createRoutine(input: CreateRoutineInput): Promise<string> {
  // Check for duplicate name
  const existing = await db.routines
    .filter((r) => r.name.toLowerCase() === input.name.trim().toLowerCase() && !r.isArchived)
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
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.routines.add(routine);
  return routine.id;
}

/**
 * Update an existing routine
 * v1.4.1: Added duplicate name check when renaming
 */
export async function updateRoutine(
  id: string,
  input: UpdateRoutineInput
): Promise<void> {
  // v1.4.1: If name is being changed, check for duplicates
  if (input.name !== undefined) {
    const existing = await db.routines
      .filter(
        (r) =>
          r.id !== id &&
          r.name.toLowerCase() === input.name!.trim().toLowerCase() &&
          !r.isArchived
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
 * Update a specific day in the routine schedule
 */
export async function updateScheduleDay(
  routineId: string,
  dayIndex: number,
  updates: Partial<RoutineDay>
): Promise<void> {
  const routine = await db.routines.get(routineId);
  if (!routine) throw new Error('Routine not found');

  const schedule = routine.schedule.map((day) =>
    day.dayIndex === dayIndex ? { ...day, ...updates } : day
  );

  await db.routines.update(routineId, {
    schedule,
    updatedAt: Date.now(),
  });
}

/**
 * Add a day to a rolling routine schedule
 */
export async function addScheduleDay(
  routineId: string,
  templateId?: string,
  label?: string
): Promise<void> {
  const routine = await db.routines.get(routineId);
  if (!routine) throw new Error('Routine not found');
  if (routine.type !== 'rolling') throw new Error('Can only add days to rolling routines');

  const newDayIndex = routine.schedule.length;
  const newDay: RoutineDay = {
    dayIndex: newDayIndex,
    templateId,
    label,
  };

  await db.routines.update(routineId, {
    schedule: [...routine.schedule, newDay],
    updatedAt: Date.now(),
  });
}

/**
 * Remove a day from a rolling routine schedule
 */
export async function removeScheduleDay(
  routineId: string,
  dayIndex: number
): Promise<void> {
  const routine = await db.routines.get(routineId);
  if (!routine) throw new Error('Routine not found');
  if (routine.type !== 'rolling') throw new Error('Can only remove days from rolling routines');
  if (routine.schedule.length <= 1) throw new Error('Routine must have at least one day');

  const schedule = routine.schedule
    .filter((day) => day.dayIndex !== dayIndex)
    .map((day, index) => ({ ...day, dayIndex: index })); // Re-index

  // Adjust currentPosition if needed
  let currentPosition = routine.currentPosition ?? 0;
  if (currentPosition >= schedule.length) {
    currentPosition = 0;
  }

  await db.routines.update(routineId, {
    schedule,
    currentPosition,
    updatedAt: Date.now(),
  });
}

/**
 * Archive a routine (soft delete)
 */
export async function archiveRoutine(id: string): Promise<void> {
  await db.routines.update(id, {
    isArchived: true,
    updatedAt: Date.now(),
  });
}

/**
 * Restore an archived routine
 */
export async function restoreRoutine(id: string): Promise<void> {
  await db.routines.update(id, {
    isArchived: false,
    updatedAt: Date.now(),
  });
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
    isArchived: false,
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
