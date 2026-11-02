import type { Run, RunKind } from '../types';

/** "5.02 km" (two decimals under 10 km, one above) */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 2 : 1)} km`;
}

/** Seconds as a clock: "28:34" / "1:02:10" */
export function formatRunTime(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** Seconds per km, or undefined when there's no distance */
export function paceSecondsPerKm(meters: number, seconds: number): number | undefined {
  return meters > 0 && seconds > 0 ? seconds / (meters / 1000) : undefined;
}

/** "5:12 /km" ("–" when unknown) */
export function formatPace(secondsPerKm: number | undefined): string {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm)) return '–';
  const total = Math.round(secondsPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} /km`;
}

export function runPace(run: Pick<Run, 'distance' | 'movingTime'>): number | undefined {
  return paceSecondsPerKm(run.distance, run.movingTime);
}

export const RUN_KIND_LABELS: Record<RunKind, string> = {
  road: 'Run',
  trail: 'Trail run',
  treadmill: 'Treadmill',
};

/**
 * Parse a typed duration: "28:34", "1:02:10", or plain minutes ("45").
 * Returns seconds, or null when invalid.
 */
export function parseDurationInput(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+([.,]\d+)?$/.test(t)) {
    const mins = parseFloat(t.replace(',', '.'));
    return mins > 0 ? Math.round(mins * 60) : null;
  }
  const parts = t.split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.slice(1).some((n) => n >= 60)) return null;
  const [h, m, s] = nums.length === 3 ? nums : [0, nums[0], nums[1]];
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}
