import type { Routine, Session } from '../types';
import { isRealWorkout, startOfLocalDay } from './session';

export interface StreakResult {
  /** Workouts in the current unbroken streak */
  currentStreak: number;
  /** Longest streak ever, in workouts */
  longestStreak: number;
}

export interface StreakOptions {
  /**
   * When the active fixed routine's schedule starts applying (e.g. the
   * activeRoutineSetAt setting). Days before this use the rolling/no-routine
   * gap rule instead, so switching routines doesn't retroactively break history.
   * Defaults to the routine's createdAt.
   */
  fixedScheduleSince?: number;
}

/** Max consecutive empty days allowed without breaking a streak (rolling / no routine) */
const MAX_REST_GAP_DAYS = 2;

interface DayInfo {
  real: boolean;
  skipped: boolean;
  sick: boolean;
}

/**
 * Compute workout streaks, measured in WORKOUTS (not calendar days), so rest days
 * built into a routine don't reset the streak.
 *
 * - A real completed workout counts +1 (several on one day count once).
 * - A `sick` day is neutral: it neither counts nor breaks, and doesn't add to a gap.
 * - A `skipped` day breaks the streak.
 * - Active FIXED routine: a past scheduled day (has templateId) with no real
 *   workout breaks the streak; rest days are neutral; today, if not done yet,
 *   is neutral.
 * - ROLLING routine or no routine: the streak breaks after 3+ consecutive
 *   calendar days without a real workout (up to 2 rest days in a row is fine).
 *   Today, if not done yet, doesn't count toward the gap.
 *
 * `longestStreak` applies the same rules over the full history.
 *
 * @param sessions All sessions (any status); non-completed ones are ignored
 * @param routine  The active routine, if any
 * @param today    Start-of-today timestamp (local midnight), e.g. from useToday()
 */
export function computeStreaks(
  sessions: Session[],
  routine: Routine | undefined,
  today: number,
  options: StreakOptions = {}
): StreakResult {
  const todayStart = startOfLocalDay(today);
  const days = new Map<number, DayInfo>();
  let firstDay = Infinity;

  for (const s of sessions) {
    if (s.completedAt == null) continue; // in-progress sessions don't count yet
    const day = startOfLocalDay(s.startedAt);
    if (day > todayStart) continue;
    const info = days.get(day) ?? { real: false, skipped: false, sick: false };
    if (isRealWorkout(s)) info.real = true;
    else if (s.status === 'skipped') info.skipped = true;
    else if (s.status === 'sick') info.sick = true;
    days.set(day, info);
    if (day < firstDay) firstDay = day;
  }

  if (firstDay === Infinity) return { currentStreak: 0, longestStreak: 0 };

  const isFixed = routine?.type === 'fixed';
  const fixedSince = isFixed
    ? startOfLocalDay(options.fixedScheduleSince ?? routine!.createdAt)
    : Infinity;
  const isScheduled = (date: Date) =>
    !!routine?.schedule.find((d) => d.dayIndex === date.getDay())?.templateId;

  let run = 0;
  let longest = 0;
  let gap = 0; // consecutive empty (non-sick) days, rolling/no-routine rule

  // Walk forward day by day using local dates (DST-safe)
  const cursor = new Date(firstDay);
  while (cursor.getTime() <= todayStart) {
    const day = cursor.getTime();
    const info = days.get(day);

    if (info?.real) {
      run += 1;
      gap = 0;
    } else if (info?.skipped) {
      run = 0;
      gap = 0;
    } else if (info?.sick) {
      // neutral
    } else if (day === todayStart) {
      // today isn't over — not done yet is neutral
    } else if (day >= fixedSince) {
      if (isScheduled(cursor)) {
        run = 0; // missed a scheduled workout
        gap = 0;
      }
      // rest day: neutral
    } else {
      gap += 1;
      if (gap > MAX_REST_GAP_DAYS) run = 0;
    }

    if (run > longest) longest = run;
    cursor.setDate(cursor.getDate() + 1);
  }

  return { currentStreak: run, longestStreak: longest };
}
