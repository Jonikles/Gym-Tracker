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

/**
 * Get weekly volume over time
 */
export function useWeeklyVolume(weeks = 12) {
  return useLiveQuery(async () => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
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
        // Use technique-aware volume calculation
        data.totalVolume += getSetVolume(set);
        data.totalSets += 1;
      }
    }

    return Array.from(weekData.values());
  }, [weeks]);
}

/**
 * Get workout frequency (sessions per week)
 */
export function useWorkoutFrequency(weeks = 12) {
  return useLiveQuery(async () => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
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
  }, [weeks]);
}

/**
 * Get muscle group volume distribution (last 30 days)
 */
export function useMuscleDistribution(days = 30) {
  return useLiveQuery(async () => {
    const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get completed sessions
    const sessions = await db.sessions
      .where('startedAt')
      .above(startDate)
      .filter((s) => !!s.completedAt)
      .toArray();

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

      // Use technique-aware volume calculation
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
 * Get overall stats
 */
export function useOverallStats() {
  return useLiveQuery(async () => {
    const sessions = await db.sessions.filter((s) => !!s.completedAt).toArray();
    const prs = await db.prs.toArray();

    // Total volume (all time)
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

    // Use technique-aware volume calculation
    const totalVolume = sets.reduce((sum, s) => sum + getSetVolume(s), 0);
    const totalSets = sets.length;

    // Streak calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentStreak = 0;
    let checkDate = new Date(today);

    while (true) {
      const dayStart = checkDate.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const hasSession = sessions.some(
        (s) => s.startedAt >= dayStart && s.startedAt < dayEnd
      );
      if (hasSession) {
        currentStreak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (currentStreak === 0) {
        // Check yesterday for streak
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStart = checkDate.getTime();
        const yesterdayEnd = yesterdayStart + 24 * 60 * 60 * 1000;
        const hasYesterday = sessions.some(
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

    return {
      totalSessions: sessions.length,
      totalVolume: Math.round(totalVolume),
      totalSets,
      totalPRs: prs.length,
      currentStreak,
    };
  }, []);
}
