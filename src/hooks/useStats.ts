import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getSetVolume } from '../utils/volume';

/**
 * Weekly volume data for charts
 */
export interface WeeklyVolumeData {
  weekStart: number;
  weekLabel: string;
  totalVolume: number;
  totalSets: number;
  sessionCount: number;
}

/**
 * Muscle group distribution
 */
export interface MuscleDistribution {
  muscleGroup: string;
  volume: number;
  sets: number;
  percentage: number;
}

/** Helper: compute a start-date timestamp from a days count (0 = all time → 0). */
function getStartDate(days: number): number {
  return days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
}

/**
 * Get weekly volume over time.
 * @param days Number of days to look back (0 = all time, capped at shown weeks).
 */
export function useWeeklyVolume(days: number) {
  return useLiveQuery(async () => {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Determine how many weeks to show
    const weeks = days > 0 ? Math.max(Math.ceil(days / 7), 4) : 52; // all-time → 1 year of weeks
    const startDate = now - weeks * weekMs;

    // Get all completed sessions in range
    const sessions = await db.sessions
      .where('startedAt')
      .above(startDate)
      .filter((s) => !!s.completedAt)
      .toArray();

    if (sessions.length === 0) return [];

    // Get all sets for these sessions
    const sessionIds = sessions.map((s) => s.id);
    const allSessionExercises = await db.sessionExercises
      .where('sessionId')
      .anyOf(sessionIds)
      .toArray();

    const sessionExerciseIds = allSessionExercises.map((se) => se.id);
    const allSets = await db.sets
      .where('sessionExerciseId')
      .anyOf(sessionExerciseIds)
      .toArray();

    // Map sets to sessions
    const seToSession = new Map(allSessionExercises.map((se) => [se.id, se.sessionId]));
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    // Group by week
    const weekData = new Map<number, WeeklyVolumeData>();

    for (let i = 0; i < weeks; i++) {
      const weekStart = now - (weeks - i) * weekMs;
      weekData.set(weekStart, {
        weekStart,
        weekLabel: new Date(weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        totalVolume: 0,
        totalSets: 0,
        sessionCount: 0,
      });
    }

    // Count sessions per week
    for (const session of sessions) {
      const weekIndex = Math.floor((session.startedAt - startDate) / weekMs);
      const weekStart = startDate + weekIndex * weekMs;
      const data = weekData.get(weekStart);
      if (data) {
        data.sessionCount += 1;
      }
    }

    // Accumulate set data
    for (const set of allSets) {
      if (set.isWarmup) continue;
      const sessionId = seToSession.get(set.sessionExerciseId);
      if (!sessionId) continue;
      const session = sessionMap.get(sessionId);
      if (!session) continue;

      const weekIndex = Math.floor((session.startedAt - startDate) / weekMs);
      const weekStart = startDate + weekIndex * weekMs;
      const data = weekData.get(weekStart);

      if (data) {
        data.totalVolume += getSetVolume(set);
        data.totalSets += 1;
      }
    }

    return Array.from(weekData.values());
  }, [days]);
}

/**
 * Get workout frequency (sessions per week)
 */
export function useWorkoutFrequency(days: number) {
  return useLiveQuery(async () => {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const weeks = days > 0 ? Math.max(Math.ceil(days / 7), 4) : 52;
    const startDate = now - weeks * weekMs;

    const sessions = await db.sessions
      .where('startedAt')
      .above(startDate)
      .filter((s) => !!s.completedAt)
      .toArray();

    // Group by week
    const weekCounts: { weekStart: number; weekLabel: string; count: number }[] = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = now - (weeks - i) * weekMs;
      const weekEnd = weekStart + weekMs;
      const count = sessions.filter(
        (s) => s.startedAt >= weekStart && s.startedAt < weekEnd
      ).length;

      weekCounts.push({
        weekStart,
        weekLabel: new Date(weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count,
      });
    }

    const totalSessions = sessions.length;
    const avgPerWeek = weeks > 0 ? totalSessions / weeks : 0;
    const currentWeekCount = weekCounts[weekCounts.length - 1]?.count ?? 0;

    return {
      weeks: weekCounts,
      totalSessions,
      avgPerWeek: Math.round(avgPerWeek * 10) / 10,
      currentWeekCount,
    };
  }, [days]);
}

/**
 * Get muscle group volume distribution.
 * @param days Number of days to look back (0 = all time).
 */
export function useMuscleDistribution(days: number) {
  return useLiveQuery(async () => {
    const startDate = getStartDate(days);

    // Get completed sessions
    let sessions;
    if (startDate > 0) {
      sessions = await db.sessions
        .where('startedAt')
        .above(startDate)
        .filter((s) => !!s.completedAt)
        .toArray();
    } else {
      sessions = await db.sessions
        .filter((s) => !!s.completedAt)
        .toArray();
    }

    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((s) => s.id);
    const sessionExercises = await db.sessionExercises
      .where('sessionId')
      .anyOf(sessionIds)
      .toArray();

    // Get exercises
    const exerciseIds = [...new Set(sessionExercises.map((se) => se.exerciseId))];
    const exercises = await db.exercises.bulkGet(exerciseIds);
    const exerciseMap = new Map(exercises.filter(Boolean).map((e) => [e!.id, e!]));

    // Get sets
    const seIds = sessionExercises.map((se) => se.id);
    const sets = await db.sets
      .where('sessionExerciseId')
      .anyOf(seIds)
      .filter((s) => !s.isWarmup)
      .toArray();

    // Map sets to session exercises
    const seMap = new Map(sessionExercises.map((se) => [se.id, se]));

    // Accumulate by muscle group
    const muscleData = new Map<string, { volume: number; sets: number }>();

    for (const set of sets) {
      const se = seMap.get(set.sessionExerciseId);
      if (!se) continue;
      const exercise = exerciseMap.get(se.exerciseId);
      if (!exercise?.muscleGroups) continue;

      const volume = getSetVolume(set);

      for (const muscle of exercise.muscleGroups) {
        const existing = muscleData.get(muscle) ?? { volume: 0, sets: 0 };
        existing.volume += volume;
        existing.sets += 1;
        muscleData.set(muscle, existing);
      }
    }

    const totalVolume = Array.from(muscleData.values()).reduce((sum, d) => sum + d.volume, 0);

    const distribution: MuscleDistribution[] = Array.from(muscleData.entries())
      .map(([muscleGroup, data]) => ({
        muscleGroup,
        volume: data.volume,
        sets: data.sets,
        percentage: totalVolume > 0 ? Math.round((data.volume / totalVolume) * 100) : 0,
      }))
      .sort((a, b) => b.volume - a.volume);

    return distribution;
  }, [days]);
}

/**
 * Get overall stats for a time period.
 * @param days Number of days to look back (0 = all time).
 */
export function useOverallStats(days: number) {
  return useLiveQuery(async () => {
    const startDate = getStartDate(days);

    let sessions;
    if (startDate > 0) {
      sessions = await db.sessions
        .where('startedAt')
        .above(startDate)
        .filter((s) => !!s.completedAt)
        .toArray();
    } else {
      sessions = await db.sessions.filter((s) => !!s.completedAt).toArray();
    }

    let prs;
    if (startDate > 0) {
      prs = await db.prs
        .where('achievedAt')
        .above(startDate)
        .toArray();
    } else {
      prs = await db.prs.toArray();
    }

    // Total volume
    const sessionIds = sessions.map((s) => s.id);
    const sessionExercises = await db.sessionExercises
      .where('sessionId')
      .anyOf(sessionIds)
      .toArray();
    const seIds = sessionExercises.map((se) => se.id);
    const sets = await db.sets
      .where('sessionExerciseId')
      .anyOf(seIds)
      .filter((s) => !s.isWarmup)
      .toArray();

    const totalVolume = sets.reduce((sum, s) => sum + getSetVolume(s), 0);
    const totalSets = sets.length;

    // Average session duration (only sessions with completedAt)
    const durationsMs = sessions
      .filter((s) => s.completedAt)
      .map((s) => s.completedAt! - s.startedAt)
      .filter((d) => d > 0 && d < 12 * 60 * 60 * 1000); // cap at 12h to exclude outliers

    const avgDurationMin = durationsMs.length > 0
      ? Math.round(durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 60000)
      : 0;

    // Streak calculation (always computed from present, regardless of period)
    const allSessions = days > 0
      ? await db.sessions.filter((s) => !!s.completedAt).toArray()
      : sessions;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentStreak = 0;
    const checkDate = new Date(today);

    while (true) {
      const dayStart = checkDate.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const hasSession = allSessions.some(
        (s) => s.startedAt >= dayStart && s.startedAt < dayEnd
      );
      if (hasSession) {
        currentStreak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (currentStreak === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStart = checkDate.getTime();
        const yesterdayEnd = yesterdayStart + 24 * 60 * 60 * 1000;
        const hasYesterday = allSessions.some(
          (s) => s.startedAt >= yesterdayStart && s.startedAt < yesterdayEnd
        );
        if (hasYesterday) {
          currentStreak = 1;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Consistency: % of weeks with ≥3 workouts
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const periodStart = startDate > 0 ? startDate : (sessions.length > 0 ? Math.min(...sessions.map(s => s.startedAt)) : Date.now());
    const totalWeeks = Math.max(1, Math.ceil((Date.now() - periodStart) / weekMs));
    let consistentWeeks = 0;
    for (let i = 0; i < totalWeeks; i++) {
      const wStart = periodStart + i * weekMs;
      const wEnd = wStart + weekMs;
      const weekSessions = sessions.filter(s => s.startedAt >= wStart && s.startedAt < wEnd);
      if (weekSessions.length >= 3) consistentWeeks++;
    }
    const consistencyRate = totalWeeks > 0 ? Math.round((consistentWeeks / totalWeeks) * 100) : 0;

    return {
      totalSessions: sessions.length,
      totalVolume: Math.round(totalVolume),
      totalSets,
      totalPRs: prs.length,
      currentStreak,
      avgDurationMin,
      consistencyRate,
    };
  }, [days]);
}

/**
 * Per-exercise breakdown for a set of muscle groups within a time period.
 * Returns exercises sorted by volume (descending), with volume, sets, and
 * percentage of the total for these muscles.
 */
export interface ExerciseBreakdownItem {
  exerciseId: string;
  exerciseName: string;
  volume: number;
  sets: number;
  percentage: number;
}

export function useMuscleExerciseBreakdown(
  days: number,
  muscleGroups: string[] | null
) {
  return useLiveQuery(
    async () => {
      if (!muscleGroups || muscleGroups.length === 0) return null;

      const startDate = getStartDate(days);

      let sessions;
      if (startDate > 0) {
        sessions = await db.sessions
          .where('startedAt')
          .above(startDate)
          .filter((s) => !!s.completedAt)
          .toArray();
      } else {
        sessions = await db.sessions
          .filter((s) => !!s.completedAt)
          .toArray();
      }

      if (sessions.length === 0) return [];

      const sessionIds = sessions.map((s) => s.id);
      const sessionExercises = await db.sessionExercises
        .where('sessionId')
        .anyOf(sessionIds)
        .toArray();

      // Get exercises
      const exerciseIds = [...new Set(sessionExercises.map((se) => se.exerciseId))];
      const exercises = await db.exercises.bulkGet(exerciseIds);
      const exerciseMap = new Map(exercises.filter(Boolean).map((e) => [e!.id, e!]));

      // Filter to only exercises that target any of the requested muscle groups
      const relevantExerciseIds = new Set<string>();
      for (const [id, ex] of exerciseMap) {
        if (ex.muscleGroups?.some((mg) => muscleGroups.includes(mg))) {
          relevantExerciseIds.add(id);
        }
      }

      // Get sets for relevant exercises
      const relevantSEs = sessionExercises.filter(
        (se) => relevantExerciseIds.has(se.exerciseId)
      );
      const seIds = relevantSEs.map((se) => se.id);
      const sets = await db.sets
        .where('sessionExerciseId')
        .anyOf(seIds)
        .filter((s) => !s.isWarmup)
        .toArray();

      const seMap = new Map(relevantSEs.map((se) => [se.id, se]));

      // Accumulate per exercise
      const exerciseData = new Map<string, { volume: number; sets: number }>();

      for (const set of sets) {
        const se = seMap.get(set.sessionExerciseId);
        if (!se) continue;
        const existing = exerciseData.get(se.exerciseId) ?? { volume: 0, sets: 0 };
        existing.volume += getSetVolume(set);
        existing.sets += 1;
        exerciseData.set(se.exerciseId, existing);
      }

      const totalVolume = Array.from(exerciseData.values()).reduce(
        (sum, d) => sum + d.volume,
        0
      );

      const result: ExerciseBreakdownItem[] = Array.from(exerciseData.entries())
        .map(([exerciseId, data]) => ({
          exerciseId,
          exerciseName: exerciseMap.get(exerciseId)?.name ?? 'Unknown',
          volume: Math.round(data.volume),
          sets: data.sets,
          percentage:
            totalVolume > 0
              ? Math.round((data.volume / totalVolume) * 100)
              : 0,
        }))
        .sort((a, b) => b.volume - a.volume);

      return result;
    },
    [days, muscleGroups?.join(',')]
  );
}
