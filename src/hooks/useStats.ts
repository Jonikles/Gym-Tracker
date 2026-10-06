import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getSetVolume } from '../utils/volume';
import { isRealWorkout, startOfLocalDay, startOfNextLocalDay } from '../utils/session';
import { loadStreaks, getActiveRoutineForStreaks } from './useStreaks';
import { useToday } from './useToday';
import type { Routine, Session } from '../types';

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
      .filter(isRealWorkout)
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
      .filter(isRealWorkout)
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
        .filter(isRealWorkout)
        .toArray();
    } else {
      sessions = await db.sessions
        .filter(isRealWorkout)
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
 * Consistency: % of weeks (calendar weeks starting on weekStartDay) that were
 * "consistent", measured from max(period start, first real workout) — weeks
 * before the user ever trained don't count against them.
 *
 * - Active fixed routine with scheduled days: a week is consistent when the
 *   number of days with a real workout is >= the scheduled days in that week
 *   (only counting days inside the measured range, up to today; today only
 *   counts once it's done; sick days are excused). Weeks with nothing required
 *   are left out.
 * - Otherwise: >= 3 real workouts in the week (fewer if the first week is
 *   partial). The current in-progress week only counts once it's met.
 */
function computeConsistencyRate(
  allSessions: Session[],
  periodStart: number,
  today: number,
  weekStartDay: number,
  routine: Routine | undefined
): number {
  const real = allSessions.filter(isRealWorkout);
  if (real.length === 0) return 0;
  const firstReal = Math.min(...real.map((s) => s.startedAt));
  const effectiveStart = startOfLocalDay(Math.max(periodStart, firstReal));
  if (effectiveStart > today) return 0;

  const realDays = new Set(real.map((s) => startOfLocalDay(s.startedAt)));
  const sickDays = new Set(
    allSessions.filter((s) => s.status === 'sick').map((s) => startOfLocalDay(s.startedAt))
  );

  const scheduledWeekdays = new Set(
    routine?.type === 'fixed'
      ? routine.schedule.filter((d) => d.templateId).map((d) => d.dayIndex)
      : []
  );
  const useFixedRule = scheduledWeekdays.size > 0;
  const tomorrow = startOfNextLocalDay(today);

  // Align to the start of the week containing effectiveStart
  const first = new Date(effectiveStart);
  const offset = (first.getDay() - weekStartDay + 7) % 7;
  const weekCursor = new Date(first.getFullYear(), first.getMonth(), first.getDate() - offset);

  let totalWeeks = 0;
  let consistentWeeks = 0;

  while (weekCursor.getTime() <= today) {
    const weekStart = weekCursor.getTime();
    const weekEnd = new Date(weekCursor.getFullYear(), weekCursor.getMonth(), weekCursor.getDate() + 7).getTime();
    const rangeStart = Math.max(weekStart, effectiveStart);
    const rangeEnd = Math.min(weekEnd, tomorrow); // exclusive
    const isCurrentWeek = weekEnd > today;

    if (useFixedRule) {
      let required = 0;
      let hit = 0;
      const d = new Date(rangeStart);
      while (d.getTime() < rangeEnd) {
        const day = d.getTime();
        const done = realDays.has(day);
        if (done) hit++;
        if (scheduledWeekdays.has(d.getDay()) && !sickDays.has(day) && (day < today || done)) {
          required++;
        }
        d.setDate(d.getDate() + 1);
      }
      if (required > 0) {
        totalWeeks++;
        if (hit >= required) consistentWeeks++;
      }
    } else {
      const count = real.filter((s) => s.startedAt >= rangeStart && s.startedAt < rangeEnd).length;
      let daysAvailable = 0;
      const d = new Date(rangeStart);
      while (d.getTime() < weekEnd) {
        daysAvailable++;
        d.setDate(d.getDate() + 1);
      }
      const required = Math.min(3, daysAvailable);
      const met = count >= required;
      if (!isCurrentWeek || met) {
        totalWeeks++;
        if (met) consistentWeeks++;
      }
    }

    weekCursor.setDate(weekCursor.getDate() + 7);
  }

  return totalWeeks > 0 ? Math.round((consistentWeeks / totalWeeks) * 100) : 0;
}

/**
 * Get overall stats for a time period.
 * @param days Number of days to look back (0 = all time).
 */
export function useOverallStats(days: number) {
  const today = useToday();
  return useLiveQuery(async () => {
    const startDate = getStartDate(days);

    // One ordered read of all sessions serves the period stats, the streak and consistency
    const allSessions = await db.sessions.orderBy('startedAt').toArray();
    const sessions = allSessions.filter((s) => isRealWorkout(s) && s.startedAt > startDate);

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

    // Average session duration
    const durationsMs = sessions
      .map((s) => s.completedAt! - s.startedAt)
      .filter((d) => d > 0 && d < 12 * 60 * 60 * 1000); // cap at 12h to exclude outliers

    const avgDurationMin = durationsMs.length > 0
      ? Math.round(durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 60000)
      : 0;

    // Streak (always computed from present, regardless of period) — shared logic
    // with useStreaks, measured in workouts.
    const { currentStreak } = await loadStreaks(today, allSessions);

    // Consistency
    const [{ routine }, weekStartSetting] = await Promise.all([
      getActiveRoutineForStreaks(),
      db.settings.get('weekStartDay'),
    ]);
    const weekStartDay = typeof weekStartSetting?.value === 'number' ? weekStartSetting.value : 0;
    const consistencyRate = computeConsistencyRate(
      allSessions,
      startDate > 0 ? startOfLocalDay(startDate) : 0,
      today,
      weekStartDay,
      routine
    );

    return {
      totalSessions: sessions.length,
      totalVolume: Math.round(totalVolume),
      totalSets,
      totalPRs: prs.length,
      currentStreak,
      avgDurationMin,
      consistencyRate,
    };
  }, [days, today]);
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
          .filter(isRealWorkout)
          .toArray();
      } else {
        sessions = await db.sessions
          .filter(isRealWorkout)
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
