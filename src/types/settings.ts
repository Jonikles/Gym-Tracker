/**
 * Settings entity - app settings and preferences
 * All values must be JSON-serializable
 */
export interface Setting {
  key: string;
  value: unknown;
  updatedAt: number;
}

/**
 * Known setting keys and their value types
 */
export interface SettingsMap {
  weightIncrement: number;
  weekStartDay: number; // 0 (Sunday) through 6 (Saturday)
  activeRoutineId: string | null; // The currently active routine
  bodyweight: number; // User's bodyweight in kg for strength standards
  activeRoutineSetAt: number | null; // When activeRoutineId was last changed — auto-skip never backfills before this
  lastAutoSkipCheckAt: number | null; // Start-of-day timestamp through which missed scheduled days have been auto-skipped
  stravaAuth: StravaAuth | null; // Strava connection (device-only: never exported or reset)
  stravaPendingState: string | null; // Random state of a sign-in in progress
  stravaLastSyncAt: number | null; // Start time (ms) of the newest synced Strava run
  runPlan: RunPlanState | null; // Active running plan, if any
}

/**
 * Progress through a running plan. Sessions are done in order: each day with a
 * run (on/after the start) or a manual mark completes the next one.
 */
export interface RunPlanState {
  planId: string;
  startedAt: number; // local midnight of the first plan day
  days: number[]; // training weekdays, 0 (Sun) – 6 (Sat)
  marks: { date: number; kind: 'done' | 'skipped' }[]; // date = local midnight
}

/**
 * Strava tokens for this device
 */
export interface StravaAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
  athlete?: { id: number; name: string };
}

/** Settings that belong to this device's Strava connection, not to the training data */
export const STRAVA_SETTING_KEYS = ['stravaAuth', 'stravaPendingState', 'stravaLastSyncAt'] as const;
