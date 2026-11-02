import type { Run } from '../types';
import { runPace } from './run';

/** Distances we track best times for. `strava` is Strava's best-effort name. */
export const BEST_TIME_DISTANCES = [
  { key: '1k', label: '1 km', meters: 1000, strava: '1k' },
  { key: '5k', label: '5 km', meters: 5000, strava: '5k' },
  { key: '10k', label: '10 km', meters: 10000, strava: '10k' },
  { key: 'half', label: 'Half marathon', meters: 21097.5, strava: 'Half-Marathon' },
] as const;

export type BestTimeKey = (typeof BEST_TIME_DISTANCES)[number]['key'];

export interface BestTime {
  key: BestTimeKey;
  label: string;
  seconds: number;
  runId: string;
  startedAt: number;
}

/**
 * A run's time for a target distance: Strava's best effort when available,
 * otherwise (hand-entered runs) the whole run when it's within a few percent
 * of the distance, scaled to exactly that distance.
 */
export function effortSeconds(run: Run, target: (typeof BEST_TIME_DISTANCES)[number]): number | undefined {
  const effort = run.bestEfforts?.find((e) => e.name === target.strava);
  if (effort) return effort.movingTime;
  if (run.bestEfforts && run.bestEfforts.length > 0) return undefined; // Strava found no such effort
  if (run.distance >= target.meters * 0.98 && run.distance <= target.meters * 1.05) {
    return (run.movingTime * target.meters) / run.distance;
  }
  return undefined;
}

/** Fastest time ever for each tracked distance */
export function computeBestTimes(runs: Run[]): BestTime[] {
  const best: BestTime[] = [];
  for (const target of BEST_TIME_DISTANCES) {
    let top: BestTime | undefined;
    for (const run of runs) {
      const seconds = effortSeconds(run, target);
      if (seconds != null && (!top || seconds < top.seconds)) {
        top = { key: target.key, label: target.label, seconds, runId: run.id, startedAt: run.startedAt };
      }
    }
    if (top) best.push(top);
  }
  return best;
}

/**
 * Runs that set a new best time (beating an earlier one), as runId → distance labels.
 * A distance's very first effort isn't counted — there was nothing to beat.
 */
export function computeRunRecords(runs: Run[]): Map<string, string[]> {
  const chronological = [...runs].sort((a, b) => a.startedAt - b.startedAt);
  const records = new Map<string, string[]>();
  for (const target of BEST_TIME_DISTANCES) {
    let best: number | undefined;
    for (const run of chronological) {
      const seconds = effortSeconds(run, target);
      if (seconds == null) continue;
      if (best != null && seconds < best) {
        records.set(run.id, [...(records.get(run.id) ?? []), target.label]);
      }
      if (best == null || seconds < best) best = seconds;
    }
  }
  return records;
}

/** Start of the week (local midnight) containing ts */
export function startOfWeek(ts: number, weekStartDay: number): number {
  const d = new Date(ts);
  const diff = (d.getDay() - weekStartDay + 7) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff).getTime();
}

export interface WeeklyDistance {
  weekStart: number;
  label: string;
  km: number;
  runs: number;
  isCurrent: boolean;
}

/** Distance per week for the last `weeks` weeks (oldest first, current week last) */
export function weeklyDistance(runs: Run[], weeks: number, weekStartDay: number, now = Date.now()): WeeklyDistance[] {
  const current = startOfWeek(now, weekStartDay);
  const buckets: WeeklyDistance[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(current);
    const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i * 7).getTime();
    buckets.push({
      weekStart,
      label: new Date(weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      km: 0,
      runs: 0,
      isCurrent: i === 0,
    });
  }
  const index = new Map(buckets.map((b, i) => [b.weekStart, i]));
  for (const run of runs) {
    const i = index.get(startOfWeek(run.startedAt, weekStartDay));
    if (i == null) continue;
    buckets[i].km += run.distance / 1000;
    buckets[i].runs++;
  }
  for (const b of buckets) b.km = Math.round(b.km * 10) / 10;
  return buckets;
}

export interface PeriodTotals {
  distance: number; // meters
  movingTime: number; // seconds
  runs: number;
}

export function totalsSince(runs: Run[], since: number): PeriodTotals {
  const totals: PeriodTotals = { distance: 0, movingTime: 0, runs: 0 };
  for (const run of runs) {
    if (run.startedAt < since) continue;
    totals.distance += run.distance;
    totals.movingTime += run.movingTime;
    totals.runs++;
  }
  return totals;
}

export interface PacePoint {
  startedAt: number;
  label: string;
  pace: number; // seconds per km
  name: string;
}

/** Average pace of each run since `since`, oldest first (runs under 1 km skipped) */
export function paceTrend(runs: Run[], since: number): PacePoint[] {
  return runs
    .filter((r) => r.startedAt >= since && r.distance >= 1000)
    .sort((a, b) => a.startedAt - b.startedAt)
    .flatMap((r) => {
      const pace = runPace(r);
      return pace == null
        ? []
        : [{
            startedAt: r.startedAt,
            label: new Date(r.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            pace: Math.round(pace),
            name: r.name,
          }];
    });
}
