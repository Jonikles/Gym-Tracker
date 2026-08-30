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
 * v1.1: Removed timer settings, RIR, defaultFields. Added weekStartDay.
 * v1.2: Removed theme (dark mode only)
 * v1.4: Added activeRoutineId for routine-centric workflow
 */
export interface SettingsMap {
  weightIncrement: number;
  weekStartDay: number; // 0 (Sunday) through 6 (Saturday)
  activeRoutineId: string | null; // v1.4: The currently active routine
  restTimerDuration: number; // Rest timer countdown in seconds (0 = disabled)
  restTimerSound: boolean; // Play sound when timer completes
  restTimerVibrate: boolean; // Vibrate when timer completes
  bodyweight: number; // User's bodyweight in kg for strength standards
  theme: 'dark' | 'light'; // UI theme
  activeRoutineSetAt: number | null; // When activeRoutineId was last changed — auto-skip never backfills before this
  lastAutoSkipCheckAt: number | null; // Start-of-day timestamp through which missed scheduled days have been auto-skipped
}
