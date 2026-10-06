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
}
