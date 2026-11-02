import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Routine, Session } from '../types';
import { computeStreaks, type StreakResult } from '../utils/streak';
import { isRealWorkout, runAsSession, startOfLocalDay } from '../utils/session';
import { useToday } from './useToday';

interface StreakData {
  /** Workouts in the current unbroken streak (rest days don't break it) */
  currentStreak: number;
  /** Longest streak ever, in workouts */
  longestStreak: number;
  /** Total completed real workouts, runs included (excludes skipped/sick) */
  totalWorkouts: number;
  /** Whether the user worked out today */
  workedOutToday: boolean;
}

/** Read the active routine (via the activeRoutineId setting) and when it became active */
export async function getActiveRoutineForStreaks(): Promise<{
  routine: Routine | undefined;
  activeSince: number | undefined;
}> {
  const [idSetting, setAtSetting] = await Promise.all([
    db.settings.get('activeRoutineId'),
    db.settings.get('activeRoutineSetAt'),
  ]);
  const id = idSetting?.value;
  const routine = typeof id === 'string' && id ? await db.routines.get(id) : undefined;
  const setAt = setAtSetting?.value;
  return { routine, activeSince: typeof setAt === 'number' ? setAt : undefined };
}

/**
 * Load everything streaks need (all sessions + runs + active routine) and compute them.
 * Shared by useStreaks and useOverallStats so both report the same streak.
 * Runs count as workouts; the returned `sessions` includes them.
 */
export async function loadStreaks(
  today: number,
  sessions?: Session[]
): Promise<StreakResult & { sessions: Session[] }> {
  const [gymSessions, runs] = await Promise.all([
    sessions ?? db.sessions.orderBy('startedAt').toArray(),
    db.runs.toArray(),
  ]);
  const allSessions = [...gymSessions, ...runs.map(runAsSession)];
  const { routine, activeSince } = await getActiveRoutineForStreaks();
  const result = computeStreaks(allSessions, routine, today, {
    fixedScheduleSince: activeSince ?? routine?.createdAt,
  });
  return { ...result, sessions: allSessions };
}

export function useStreaks(): StreakData | undefined {
  const today = useToday();
  return useLiveQuery(async () => {
    const { currentStreak, longestStreak, sessions } = await loadStreaks(today);

    let totalWorkouts = 0;
    let workedOutToday = false;
    for (const s of sessions) {
      if (!isRealWorkout(s)) continue;
      totalWorkouts++;
      if (startOfLocalDay(s.startedAt) === today) workedOutToday = true;
    }

    return { currentStreak, longestStreak, totalWorkouts, workedOutToday };
  }, [today]);
}
