import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Session, SessionExercise, Set, Template, TemplateExercise } from '../types';
import { advanceRollingPosition } from './useRoutines';
import { detectAndSaveExercisePRs } from '../utils/pr';
import { detectAndSaveProgressionAdvancements } from '../utils/progression';
import { getLastUsedExerciseForProgression } from './useProgressions';
import { useToday } from './useToday';
import { startOfLocalDay, startOfNextLocalDay } from '../utils/session';

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
    // Most recent incomplete session — walks the startedAt index newest-first
    // and stops at the first match instead of materializing every session.
    return db.sessions
      .orderBy('startedAt')
      .reverse()
      .filter((s) => s.completedAt == null)
      .first();
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

    // Resolve exerciseId for progression slots
    let resolvedExerciseId = te.exerciseId;
    if (te.progressionId) {
      const lastUsed = await getLastUsedExerciseForProgression(te.progressionId);
      if (lastUsed) {
        resolvedExerciseId = lastUsed.id;
      }
    }

    // Create session exercise
    sessionExercises.push({
      id: sessionExerciseId,
      sessionId,
      exerciseId: resolvedExerciseId,
      progressionId: te.progressionId,
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
  // One readwrite transaction for PR detection + status update + rolling advance,
  // so a double tap serializes: the second call sees completedAt and returns
  // without creating duplicate PRs or advancing the routine twice.
  await db.transaction(
    'rw',
    [db.sessions, db.sessionExercises, db.sets, db.prs, db.exercises, db.routines],
    async () => {
      const session = await db.sessions.get(sessionId);
      if (!session) throw new Error('Session not found');
      if (session.completedAt != null) return; // already completed — idempotent

      const sessionExercises = await db.sessionExercises
        .where('sessionId')
        .equals(sessionId)
        .toArray();

      const allSets = sessionExercises.length > 0
        ? await db.sets.where('sessionExerciseId').anyOf(sessionExercises.map((se) => se.id)).toArray()
        : [];
      const setsBySE = new Map<string, Set[]>();
      for (const set of allSets) {
        const list = setsBySE.get(set.sessionExerciseId) ?? [];
        list.push(set);
        setsBySE.set(set.sessionExerciseId, list);
      }

      for (const se of sessionExercises) {
        const sets = (setsBySE.get(se.id) ?? []).sort((a, b) => a.order - b.order);

        // Weight/reps/e1rm PRs — one row per type per exercise for the whole
        // session. Eligibility filtering happens inside (shared with the preview).
        if (sets.length > 0) {
          await detectAndSaveExercisePRs(sets, se.exerciseId);
        }

        // Progression level-up is an exercise-level event: detect once per
        // exercise, credited to the first working set with data (same as preview).
        const firstSetWithData = sets.find(
          (set) => !set.isWarmup && (set.weight || set.reps || set.time || set.distance)
        );
        if (firstSetWithData) {
          await detectAndSaveProgressionAdvancements(se.exerciseId, firstSetWithData.id);
        }
      }

      const now = Date.now();
      await db.sessions.update(sessionId, {
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      });

      // If from a rolling routine, advance the position
      if (session.routineId) {
        const routine = await db.routines.get(session.routineId);
        if (routine?.type === 'rolling') {
          await advanceRollingPosition(session.routineId);
        }
      }
    }
  );
}

/**
 * Record a skipped/sick day for a routine. Idempotent per routine per day: if a
 * skipped/sick session already exists today for this routine, it is reused
 * (its status updated if different) and the rolling position isn't advanced again.
 */
async function markRoutineDay(
  routineId: string,
  templateId: string | undefined,
  status: 'skipped' | 'sick'
): Promise<string> {
  return db.transaction('rw', [db.sessions, db.routines], async () => {
    const now = Date.now();
    const dayStart = startOfLocalDay(now);
    const dayEnd = startOfNextLocalDay(now);

    const existing = await db.sessions
      .where('startedAt')
      .between(dayStart, dayEnd, true, false)
      .filter((s) => s.routineId === routineId && (s.status === 'skipped' || s.status === 'sick'))
      .first();

    if (existing) {
      if (existing.status !== status) {
        await db.sessions.update(existing.id, { status, updatedAt: now });
      }
      return existing.id;
    }

    const sessionId = crypto.randomUUID();
    const session: Session = {
      id: sessionId,
      routineId,
      templateId,
      status,
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
  });
}

/**
 * Mark a workout day as skipped
 * v1.4: Creates a minimal session with skipped status
 */
export async function skipWorkout(
  routineId: string,
  templateId?: string
): Promise<string> {
  return markRoutineDay(routineId, templateId, 'skipped');
}

/**
 * Mark a workout day as sick
 * v1.4: Creates a minimal session with sick status
 */
export async function markSick(
  routineId: string,
  templateId?: string
): Promise<string> {
  return markRoutineDay(routineId, templateId, 'sick');
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
  await db.transaction('rw', [db.sessions, db.sessionExercises, db.sets, db.prs], async () => {
    // Get all session exercises
    const seIds = (await db.sessionExercises
      .where('sessionId')
      .equals(sessionId)
      .primaryKeys()) as string[];

    // Get all sets for those exercises (one indexed query)
    const setIds = seIds.length > 0
      ? ((await db.sets.where('sessionExerciseId').anyOf(seIds).primaryKeys()) as string[])
      : [];

    // Delete in order: PRs earned by these sets, sets, session exercises, session
    if (setIds.length > 0) {
      await db.prs.where('setId').anyOf(setIds).delete();
    }
    await db.sets.bulkDelete(setIds);
    await db.sessionExercises.bulkDelete(seIds);
    await db.sessions.delete(sessionId);
  });
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
 * Switch the progression level for a session exercise mid-workout.
 * Swaps the exerciseId in-place on the existing SessionExercise.
 * Keeps existing sets (user's logged data is preserved).
 * Returns the same SessionExercise ID.
 */
export async function switchProgressionLevel(
  _sessionId: string,
  currentSessionExerciseId: string,
  newExerciseId: string
): Promise<string> {
  const currentSE = await db.sessionExercises.get(currentSessionExerciseId);
  if (!currentSE) throw new Error('Session exercise not found');

  // Simply swap the exerciseId — keeps all existing sets, order, groups intact
  await db.sessionExercises.update(currentSessionExerciseId, {
    exerciseId: newExerciseId,
  });

  return currentSessionExerciseId;
}

/**
 * Remove an exercise from a session
 */
export async function removeExerciseFromSession(
  sessionExerciseId: string
): Promise<void> {
  await db.transaction('rw', [db.sessionExercises, db.sets, db.prs], async () => {
    // Delete all sets for this exercise, and any PRs they earned
    const setIds = (await db.sets
      .where('sessionExerciseId')
      .equals(sessionExerciseId)
      .primaryKeys()) as string[];
    if (setIds.length > 0) {
      await db.prs.where('setId').anyOf(setIds).delete();
      await db.sets.bulkDelete(setIds);
    }

    // Delete the session exercise
    await db.sessionExercises.delete(sessionExerciseId);
  });
}

/**
 * Group exercises into a superset or circuit
 */
export async function groupSessionExercises(
  sessionExerciseIds: string[],
  groupType: 'superset' | 'circuit'
): Promise<void> {
  if (sessionExerciseIds.length < 2) return;
  const groupId = crypto.randomUUID();

  const updates = sessionExerciseIds.map((id, index) =>
    db.sessionExercises.update(id, {
      groupId,
      groupType,
      groupOrder: index,
    })
  );
  await Promise.all(updates);
}

/**
 * Remove an exercise from its group (ungroup single exercise)
 */
export async function ungroupSessionExercise(
  sessionExerciseId: string
): Promise<void> {
  const se = await db.sessionExercises.get(sessionExerciseId);
  if (!se?.groupId) return;

  const groupId = se.groupId;

  // Remove this exercise from group
  await db.sessionExercises.update(sessionExerciseId, {
    groupId: undefined,
    groupType: undefined,
    groupOrder: undefined,
  });

  // Check remaining group members — if only 1 left, dissolve the group
  const remaining = await db.sessionExercises
    .where('sessionId')
    .equals(se.sessionId)
    .filter((e) => e.groupId === groupId && e.id !== sessionExerciseId)
    .toArray();

  if (remaining.length <= 1) {
    for (const r of remaining) {
      await db.sessionExercises.update(r.id, {
        groupId: undefined,
        groupType: undefined,
        groupOrder: undefined,
      });
    }
  }
}

/**
 * Dissolve an entire group back to individual exercises
 */
export async function ungroupAllSessionExercises(
  sessionId: string,
  groupId: string
): Promise<void> {
  const members = await db.sessionExercises
    .where('sessionId')
    .equals(sessionId)
    .filter((e) => e.groupId === groupId)
    .toArray();

  const updates = members.map((m) =>
    db.sessionExercises.update(m.id, {
      groupId: undefined,
      groupType: undefined,
      groupOrder: undefined,
    })
  );
  await Promise.all(updates);
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
 * Get template exercise config for a specific exercise in a session.
 * For progression slots, matches by progressionId first.
 */
export async function getTemplateExerciseConfig(
  sessionId: string,
  exerciseId: string,
  progressionId?: string
): Promise<TemplateExercise | undefined> {
  const template = await getTemplateForSession(sessionId);
  if (!template) return undefined;

  // For progression slots, match by progressionId
  if (progressionId) {
    return template.exercises.find((e) => e.progressionId === progressionId);
  }
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

    // Resolve exerciseId for progression slots
    let resolvedExerciseId = te.exerciseId;
    if (te.progressionId) {
      const lastUsed = await getLastUsedExerciseForProgression(te.progressionId);
      if (lastUsed) {
        resolvedExerciseId = lastUsed.id;
      }
    }

    sessionExercises.push({
      id: sessionExerciseId,
      sessionId,
      exerciseId: resolvedExerciseId,
      progressionId: te.progressionId,
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

  // All source sets in one indexed query, grouped by session exercise
  const allSourceSets = sorted.length > 0
    ? await db.sets.where('sessionExerciseId').anyOf(sorted.map((se) => se.id)).toArray()
    : [];
  const sourceSetsBySE = new Map<string, Set[]>();
  for (const s of allSourceSets) {
    const list = sourceSetsBySE.get(s.sessionExerciseId) ?? [];
    list.push(s);
    sourceSetsBySE.set(s.sessionExerciseId, list);
  }

  for (const se of sorted) {
    const newSEId = crypto.randomUUID();
    newExercises.push({
      id: newSEId,
      sessionId: newSessionId,
      exerciseId: se.exerciseId,
      progressionId: se.progressionId,
      order: se.order,
      groupId: se.groupId,
      groupType: se.groupType,
      groupOrder: se.groupOrder,
      notes: se.notes,
      createdAt: now,
    });

    // Copy sets: keep weight and structure, clear reps (user fills in)
    const sortedSets = [...(sourceSetsBySE.get(se.id) ?? [])].sort((a, b) => a.order - b.order);

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
  // Re-runs at local midnight / on app resume so "today" never goes stale
  const today = useToday();
  return useLiveQuery(
    async () => {
      if (!routineId) return undefined;

      const endOfDay = startOfNextLocalDay(today);

      return db.sessions
        .where('startedAt')
        .between(today, endOfDay, true, false)
        .filter((s) => s.routineId === routineId && s.completedAt != null)
        .first();
    },
    [routineId, today]
  );
}
