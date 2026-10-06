import type { Session } from '../types';

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
