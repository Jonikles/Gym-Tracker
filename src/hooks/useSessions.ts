import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Session, SessionExercise, Set, Template, TemplateExercise } from '../types';
import { advanceRollingPosition } from './useRoutines';
import { detectAndSavePRs } from '../utils/pr';
import { detectAndSaveProgressionAdvancements } from '../utils/progression';

/**
 * Filter options for session queries
 */
export interface SessionFilters {
  routineId?: string;
  templateId?: string;
  startDate?: number;
  endDate?: number;
  completed?: boolean;
}

/**
 * Hook for session queries with optional filters
 */
export function useSessions(filters?: SessionFilters) {
  const sessions = useLiveQuery(async () => {
    let results = await db.sessions.toArray();

    // Filter by routine
    if (filters?.routineId) {
      results = results.filter((s) => s.routineId === filters.routineId);
    }

    // Filter by template
    if (filters?.templateId) {
      results = results.filter((s) => s.templateId === filters.templateId);
    }

    // Filter by date range
    if (filters?.startDate) {
      results = results.filter((s) => s.startedAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      results = results.filter((s) => s.startedAt <= filters.endDate!);
    }

    // Filter by completion status
    if (filters?.completed !== undefined) {
      results = results.filter((s) =>
        filters.completed ? s.completedAt != null : s.completedAt == null
      );
    }

    // Sort by date descending (most recent first)
    results.sort((a, b) => b.startedAt - a.startedAt);

    return results;
  }, [filters?.routineId, filters?.templateId, filters?.startDate, filters?.endDate, filters?.completed]);

  return sessions ?? [];
}

/**
 * Hook to get a single session by ID
 */
export function useSession(id: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!id) return undefined;
      return db.sessions.get(id);
    },
    [id]
  );
}

/**
 * Hook to get session exercises for a session
 */
export function useSessionExercises(sessionId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!sessionId) return [];
      const exercises = await db.sessionExercises
        .where('sessionId')
        .equals(sessionId)
        .toArray();
      return exercises.sort((a, b) => a.order - b.order);
    },
    [sessionId]
  );
}

/**
 * Hook to get an active (incomplete) session if one exists
 */
export function useActiveSession() {
  return useLiveQuery(async () => {
    const sessions = await db.sessions
      .filter((s) => s.completedAt == null)
      .toArray();
    // Return the most recent incomplete session
    return sessions.sort((a, b) => b.startedAt - a.startedAt)[0];
  }, []);
}

/**
 * Get the last session that included a specific exercise
 */
export async function getLastSessionForExercise(
  exerciseId: string
): Promise<{ session: Session; sessionExercise: SessionExercise } | undefined> {
  // Find all session exercises for this exercise
  const sessionExercises = await db.sessionExercises
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();

  if (sessionExercises.length === 0) return undefined;

  // Get the sessions and find the most recent completed one
  const sessionIds = [...new Set(sessionExercises.map((se) => se.sessionId))];
  const sessions = await db.sessions.bulkGet(sessionIds);

  const completedSessions = sessions
    .filter((s): s is Session => s != null && s.completedAt != null)
    .sort((a, b) => b.startedAt - a.startedAt);

  if (completedSessions.length === 0) return undefined;

  const lastSession = completedSessions[0];
  const lastSessionExercise = sessionExercises.find(
    (se) => se.sessionId === lastSession.id
  );

  return lastSessionExercise
    ? { session: lastSession, sessionExercise: lastSessionExercise }
    : undefined;
}

/**
 * Start a new session from a template
 * v1.2: Pre-creates sets from template definition
 */
export async function startSessionFromTemplate(
  templateId: string,
  routineId?: string
): Promise<string> {
  const template = await db.templates.get(templateId);
  if (!template) throw new Error('Template not found');

  const now = Date.now();
  const sessionId = crypto.randomUUID();

  // Create the session
  const session: Session = {
    id: sessionId,
    templateId,
    routineId,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.sessions.add(session);

  // Copy template exercises to session exercises and pre-create sets
  const sessionExercises: SessionExercise[] = [];
  const setsToCreate: Set[] = [];

  const sortedExercises = [...template.exercises].sort((a, b) => a.order - b.order);

  for (let i = 0; i < sortedExercises.length; i++) {
    const te = sortedExercises[i];
    const sessionExerciseId = crypto.randomUUID();

    // Create session exercise
    sessionExercises.push({
      id: sessionExerciseId,
      sessionId,
      exerciseId: te.exerciseId,
      order: i + 1,
      groupId: te.groupId,
      groupType: te.groupType,
      groupOrder: te.groupOrder,
      notes: te.notes,
      createdAt: now,
    });

    // Pre-create sets from template set definitions
    const sortedSets = [...te.sets].sort((a, b) => a.order - b.order);
    for (let j = 0; j < sortedSets.length; j++) {
      const ts = sortedSets[j];
      setsToCreate.push({
        id: crypto.randomUUID(),
        sessionExerciseId,
        order: j + 1,
        weight: te.weight, // Use template exercise target weight if defined
        reps: undefined, // User fills this in
        targetReps: te.targetReps, // From template exercise (same for all sets)
        isWarmup: ts.isWarmup,
        intensityTechnique: ts.intensityTechnique,
        createdAt: now,
      });
    }
  }

  await db.sessionExercises.bulkAdd(sessionExercises);
  await db.sets.bulkAdd(setsToCreate);

  return sessionId;
}

/**
 * Start a new session from a routine (uses today's scheduled template)
 */
export async function startSessionFromRoutine(routineId: string): Promise<string> {
  const routine = await db.routines.get(routineId);
  if (!routine) throw new Error('Routine not found');

  let templateId: string | undefined;

  if (routine.type === 'fixed') {
    // Find today's template
    const dayOfWeek = new Date().getDay();
    const todaySchedule = routine.schedule.find((s) => s.dayIndex === dayOfWeek);
    templateId = todaySchedule?.templateId;
  } else {
    // Rolling: use current position
    const currentPos = routine.currentPosition ?? 0;
    templateId = routine.schedule[currentPos]?.templateId;
  }

  if (!templateId) {
    // No template scheduled - start blank session with routine reference
    const now = Date.now();
    const sessionId = crypto.randomUUID();

    const session: Session = {
      id: sessionId,
      routineId,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await db.sessions.add(session);
    return sessionId;
  }

  return startSessionFromTemplate(templateId, routineId);
}

/**
 * Start a blank session
 */
export async function startBlankSession(): Promise<string> {
  const now = Date.now();
  const sessionId = crypto.randomUUID();

  const session: Session = {
    id: sessionId,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.sessions.add(session);
  return sessionId;
}

/**
 * Complete a session
 * v1.4: Added status field
 * v1.5: PRs are now detected and saved on completion (not during logging)
 */
export async function completeSession(sessionId: string): Promise<void> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  // Detect and save all PRs for this session's sets
  const sessionExercises = await db.sessionExercises
    .where('sessionId')
    .equals(sessionId)
    .toArray();

  for (const se of sessionExercises) {
    const sets = await db.sets
      .where('sessionExerciseId')
      .equals(se.id)
      .toArray();

    for (const set of sets) {
      if (set.isWarmup) continue;

      // Detect and save weight/reps/e1rm PRs
      if (set.weight && set.reps) {
        const canCalculatePR = ['standard', 'failure', 'forcedreps'].includes(
          set.intensityTechnique ?? 'standard'
        );
        if (canCalculatePR) {
          await detectAndSavePRs(set, se.exerciseId);
        }
      }

      // Detect and save progression level-ups
      if (set.weight || set.reps || set.time || set.distance) {
        await detectAndSaveProgressionAdvancements(se.exerciseId, set.id);
      }
    }
  }

  await db.sessions.update(sessionId, {
    status: 'completed',
    completedAt: Date.now(),
    updatedAt: Date.now(),
  });

  // If from a rolling routine, advance the position
  if (session.routineId) {
    const routine = await db.routines.get(session.routineId);
    if (routine?.type === 'rolling') {
      await advanceRollingPosition(session.routineId);
    }
  }
}

/**
 * Mark a workout day as skipped
 * v1.4: Creates a minimal session with skipped status
 */
export async function skipWorkout(
  routineId: string,
  templateId?: string
): Promise<string> {
  const now = Date.now();
  const sessionId = crypto.randomUUID();

  const session: Session = {
    id: sessionId,
    routineId,
    templateId,
    status: 'skipped',
    startedAt: now,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.sessions.add(session);

  // If from a rolling routine, advance the position
  const routine = await db.routines.get(routineId);
  if (routine?.type === 'rolling') {
    await advanceRollingPosition(routineId);
  }

  return sessionId;
}

/**
 * Mark a workout day as sick
 * v1.4: Creates a minimal session with sick status
 */
export async function markSick(
  routineId: string,
  templateId?: string
): Promise<string> {
  const now = Date.now();
  const sessionId = crypto.randomUUID();

  const session: Session = {
    id: sessionId,
    routineId,
    templateId,
    status: 'sick',
    startedAt: now,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.sessions.add(session);

  // If from a rolling routine, advance the position
  const routine = await db.routines.get(routineId);
  if (routine?.type === 'rolling') {
    await advanceRollingPosition(routineId);
  }

  return sessionId;
}

/**
 * Abandon a session (completely discard - deletes all data)
 */
export async function abandonSession(sessionId: string): Promise<void> {
  // Delete the session and all its data
  await deleteSession(sessionId);
}

/**
 * Delete a session and all its data
 */
export async function deleteSession(sessionId: string): Promise<void> {
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

  // Delete in order: sets, session exercises, session
  await db.sets.bulkDelete(setIds);
  await db.sessionExercises.bulkDelete(sessionExercises.map((se) => se.id));
  await db.sessions.delete(sessionId);
}

/**
 * Add an exercise to an active session
 */
export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string
): Promise<string> {
  const existingExercises = await db.sessionExercises
    .where('sessionId')
    .equals(sessionId)
    .toArray();

  const maxOrder = Math.max(0, ...existingExercises.map((e) => e.order));

  const sessionExercise: SessionExercise = {
    id: crypto.randomUUID(),
    sessionId,
    exerciseId,
    order: maxOrder + 1,
    createdAt: Date.now(),
  };

  await db.sessionExercises.add(sessionExercise);
  return sessionExercise.id;
}

/**
 * Remove an exercise from a session
 */
export async function removeExerciseFromSession(
  sessionExerciseId: string
): Promise<void> {
  // Delete all sets for this exercise
  const sets = await db.sets
    .where('sessionExerciseId')
    .equals(sessionExerciseId)
    .toArray();
  await db.sets.bulkDelete(sets.map((s) => s.id));

  // Delete the session exercise
  await db.sessionExercises.delete(sessionExerciseId);
}

/**
 * Reorder exercises in a session
 */
export async function reorderSessionExercises(
  sessionId: string,
  exerciseIds: string[]
): Promise<void> {
  const sessionExercises = await db.sessionExercises
    .where('sessionId')
    .equals(sessionId)
    .toArray();

  const updates = exerciseIds.map((id, index) => {
    const se = sessionExercises.find((e) => e.id === id);
    if (!se) return null;
    return db.sessionExercises.update(id, { order: index + 1 });
  });

  await Promise.all(updates.filter(Boolean));
}

/**
 * Update session notes
 */
export async function updateSessionNotes(
  sessionId: string,
  notes: string
): Promise<void> {
  await db.sessions.update(sessionId, {
    notes,
    updatedAt: Date.now(),
  });
}

/**
 * Update session start time and/or completed time
 */
export async function updateSessionTimes(
  sessionId: string,
  updates: { startedAt?: number; completedAt?: number }
): Promise<void> {
  await db.sessions.update(sessionId, {
    ...updates,
    updatedAt: Date.now(),
  });
}

/**
 * Update notes on a session exercise
 */
export async function updateSessionExerciseNotes(
  sessionExerciseId: string,
  notes: string
): Promise<void> {
  await db.sessionExercises.update(sessionExerciseId, { notes: notes || undefined });
}

/**
 * Get template exercise details for a session
 */
export async function getTemplateForSession(
  sessionId: string
): Promise<Template | undefined> {
  const session = await db.sessions.get(sessionId);
  if (!session?.templateId) return undefined;
  return db.templates.get(session.templateId);
}

/**
 * Get template exercise config for a specific exercise in a session
 */
export async function getTemplateExerciseConfig(
  sessionId: string,
  exerciseId: string
): Promise<TemplateExercise | undefined> {
  const template = await getTemplateForSession(sessionId);
  if (!template) return undefined;
  return template.exercises.find((e) => e.exerciseId === exerciseId);
}

/**
 * Import a template into an existing session
 * v1.4: For blank workouts that want to use a template
 */
export async function importTemplateIntoSession(
  sessionId: string,
  templateId: string
): Promise<void> {
  const template = await db.templates.get(templateId);
  if (!template) throw new Error('Template not found');

  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const now = Date.now();

  // Update session to reference the template
  await db.sessions.update(sessionId, {
    templateId,
    updatedAt: now,
  });

  // Get existing exercises count for ordering
  const existingExercises = await db.sessionExercises
    .where('sessionId')
    .equals(sessionId)
    .toArray();
  const startOrder = existingExercises.length;

  // Copy template exercises to session exercises and pre-create sets
  const sessionExercises: SessionExercise[] = [];
  const setsToCreate: Set[] = [];

  const sortedExercises = [...template.exercises].sort((a, b) => a.order - b.order);

  for (let i = 0; i < sortedExercises.length; i++) {
    const te = sortedExercises[i];
    const sessionExerciseId = crypto.randomUUID();

    sessionExercises.push({
      id: sessionExerciseId,
      sessionId,
      exerciseId: te.exerciseId,
      order: startOrder + i + 1,
      groupId: te.groupId,
      groupType: te.groupType,
      groupOrder: te.groupOrder,
      notes: te.notes,
      createdAt: now,
    });

    const sortedSets = [...te.sets].sort((a, b) => a.order - b.order);
    for (let j = 0; j < sortedSets.length; j++) {
      const ts = sortedSets[j];
      setsToCreate.push({
        id: crypto.randomUUID(),
        sessionExerciseId,
        order: j + 1,
        weight: te.weight,
        reps: undefined,
        targetReps: te.targetReps,
        isWarmup: ts.isWarmup,
        intensityTechnique: ts.intensityTechnique,
        createdAt: now,
      });
    }
  }

  await db.sessionExercises.bulkAdd(sessionExercises);
  await db.sets.bulkAdd(setsToCreate);
}

/**
 * Repeat a past session: creates a new active session with the same exercises/sets
 * Copies exercise structure and set weights, but leaves reps blank for the user to fill in.
 */
export async function repeatSession(sourceSessionId: string): Promise<string> {
  const sourceSession = await db.sessions.get(sourceSessionId);
  if (!sourceSession) throw new Error('Session not found');

  const now = Date.now();
  const newSessionId = crypto.randomUUID();

  // Create the new session (link to same routine/template if applicable)
  const session: Session = {
    id: newSessionId,
    routineId: sourceSession.routineId,
    templateId: sourceSession.templateId,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await db.sessions.add(session);

  // Copy all exercises and sets from the source session
  const sourceExercises = await db.sessionExercises
    .where('sessionId')
    .equals(sourceSessionId)
    .toArray();
  const sorted = [...sourceExercises].sort((a, b) => a.order - b.order);

  const newExercises: SessionExercise[] = [];
  const newSets: Set[] = [];

  for (const se of sorted) {
    const newSEId = crypto.randomUUID();
    newExercises.push({
      id: newSEId,
      sessionId: newSessionId,
      exerciseId: se.exerciseId,
      order: se.order,
      groupId: se.groupId,
      groupType: se.groupType,
      groupOrder: se.groupOrder,
      notes: se.notes,
      createdAt: now,
    });

    // Copy sets: keep weight and structure, clear reps (user fills in)
    const sourceSets = await db.sets
      .where('sessionExerciseId')
      .equals(se.id)
      .toArray();
    const sortedSets = [...sourceSets].sort((a, b) => a.order - b.order);

    for (const s of sortedSets) {
      newSets.push({
        id: crypto.randomUUID(),
        sessionExerciseId: newSEId,
        order: s.order,
        weight: s.weight,
        reps: undefined, // User fills this in
        time: undefined,
        distance: undefined,
        targetReps: s.targetReps,
        isWarmup: s.isWarmup,
        intensityTechnique: s.intensityTechnique,
        createdAt: now,
      });
    }
  }

  await db.sessionExercises.bulkAdd(newExercises);
  await db.sets.bulkAdd(newSets);

  return newSessionId;
}

/**
 * Get today's session for a routine (if any)
 * v1.4: Check if there's already a workout logged for today
 */
export function useTodaysSession(routineId: string | null | undefined) {
  return useLiveQuery(
    async () => {
      if (!routineId) return undefined;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

      const sessions = await db.sessions
        .filter(
          (s) =>
            s.routineId === routineId &&
            s.startedAt >= startOfDay &&
            s.startedAt < endOfDay &&
            s.completedAt != null
        )
        .toArray();

      return sessions[0];
    },
    [routineId]
  );
}
