import { db } from '../db';
import type { Session, SessionExercise } from '../types';

/**
 * A "real" workout: a completed session that isn't a skipped or sick placeholder.
 * Use this everywhere stats/streaks count workouts.
 */
export function isRealWorkout(session: Session): boolean {
  return session.completedAt != null && session.status !== 'skipped' && session.status !== 'sick';
}

/** Start of the local day (midnight) containing the timestamp */
export function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Start of the local day after the one containing the timestamp (DST-safe) */
export function startOfNextLocalDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

/**
 * Of the given session exercises, the one belonging to the most recently
 * started completed session (undefined if none of their sessions is completed).
 */
export async function findLatestCompletedSessionExercise(
  sessionExercises: SessionExercise[]
): Promise<SessionExercise | undefined> {
  if (sessionExercises.length === 0) return undefined;

  const sessionIds = [...new Set(sessionExercises.map((se) => se.sessionId))];
  const sessions = await db.sessions.bulkGet(sessionIds);

  const completedSessions = sessions
    .filter((s): s is Session => s != null && s.completedAt != null)
    .sort((a, b) => b.startedAt - a.startedAt);

  if (completedSessions.length === 0) return undefined;

  const lastSession = completedSessions[0];
  return sessionExercises.find((se) => se.sessionId === lastSession.id);
}
