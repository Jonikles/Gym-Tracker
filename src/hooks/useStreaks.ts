import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface StreakData {
  /** Current consecutive workout days (or 0) */
  currentStreak: number;
  /** Longest streak ever */
  longestStreak: number;
  /** Total completed workouts */
  totalWorkouts: number;
  /** Whether the user worked out today */
  workedOutToday: boolean;
}

/** Get the start of a day (midnight) for a timestamp in local time */
function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Get the day difference between two timestamps */
function daysBetween(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / (24 * 60 * 60 * 1000));
}

export function useStreaks(): StreakData | undefined {
  return useLiveQuery(async () => {
    const sessions = await db.sessions
      .filter((s) => s.completedAt != null)
      .toArray();

    if (sessions.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalWorkouts: 0,
        workedOutToday: false,
      };
    }

    // Get unique workout days (local dates), sorted descending
    const daySet = new Set<number>();
    for (const s of sessions) {
      daySet.add(startOfDay(s.startedAt));
    }

    const sortedDays = Array.from(daySet).sort((a, b) => b - a); // newest first
    const today = startOfDay(Date.now());
    const workedOutToday = sortedDays[0] === today;

    // Calculate current streak
    let currentStreak = 0;
    // Start from today or yesterday depending on whether we worked out today
    let expectedDay = workedOutToday ? today : today - 24 * 60 * 60 * 1000;

    for (const day of sortedDays) {
      const diff = daysBetween(day, expectedDay);
      if (diff === 0) {
        currentStreak++;
        expectedDay = day - 24 * 60 * 60 * 1000;
      } else if (diff > 0) {
        // Gap found — streak broken
        break;
      }
      // diff < 0 means we're looking at a day later than expected (shouldn't happen with sorted desc)
    }

    // Calculate longest streak
    let longestStreak = 0;
    let streak = 1;
    const sortedAsc = [...sortedDays].reverse(); // oldest first
    for (let i = 1; i < sortedAsc.length; i++) {
      const diff = daysBetween(sortedAsc[i - 1], sortedAsc[i]);
      if (diff === 1) {
        streak++;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);

    return {
      currentStreak,
      longestStreak,
      totalWorkouts: sessions.length,
      workedOutToday,
    };
  });
}
