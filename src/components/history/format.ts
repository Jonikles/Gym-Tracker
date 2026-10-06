/**
 * Shared date/time/duration formatting for history + session views.
 * All dates use the device locale (`undefined`) so headers and cards match.
 */

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
