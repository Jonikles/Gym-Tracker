/** Format a kebab-case muscle group key for display: "upper-chest" → "Upper Chest" */
export function formatMuscleGroup(mg: string): string {
  return mg
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Capitalize the first letter: "barbell" → "Barbell" */
export function formatLabel(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Compact number for big volume totals: 950 → "950", 137_040 → "137k", 1_250_000 → "1.3M" */
export function formatCompactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trimZero((n / 1_000_000).toFixed(1))}M`;
  if (abs >= 100_000) return `${Math.round(n / 1000)}k`;
  if (abs >= 1000) return `${trimZero((n / 1000).toFixed(1))}k`;
  return `${Math.round(n)}`;
}

function trimZero(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

// ── Dates & times — all use the device locale so headers and cards match ──

/** "Oct 5" (device locale) */
export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** "Oct 5, 2026" (device locale) */
export function formatMediumDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Local calendar date as an <input type="date"> value: "2026-10-05" */
export function formatDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "Mon, Oct 5" (device locale) */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** "Monday, October 5, 2026" (device locale) */
export function formatLongDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Date group header for history lists — includes the year when not the current year */
export function formatGroupDate(timestamp: number): string {
  const d = new Date(timestamp);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** "14:05" / "2:05 PM" (device locale) */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Whole minutes between start and completion (0 when incomplete) */
export function getDurationMinutes(startedAt: number, completedAt?: number): number {
  if (!completedAt) return 0;
  return Math.floor((completedAt - startedAt) / 1000 / 60);
}

/** "45min" / "1h 5m" / "Incomplete" */
export function formatDuration(startedAt: number, completedAt?: number): string {
  if (!completedAt) return 'Incomplete';
  const mins = getDurationMinutes(startedAt, completedAt);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

/** Running clock: "4:07" / "1:04:07" */
export function formatElapsed(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Volume rounded to whole kg: "12,340kg" */
export function formatVolume(kg: number): string {
  const rounded = Math.round(kg);
  return `${rounded.toLocaleString()}kg`;
}
