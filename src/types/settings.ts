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
  garminApiKey: string | null; // Garmin Personal API key (device-only: never exported or reset)
  garminLastSyncAt: number | null; // Start time (ms) of the newest synced Garmin run
  runPlan: RunPlanState | null; // Active running plan, if any
  backupKey: string | null; // Cloud backup key (device-only: never exported or reset)
  lastCloudBackupAt: number | null; // When this device last uploaded a cloud backup
  lastCloudBackupHash: string | null; // Hash of the data in that upload (skips unchanged uploads)
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

/** Settings that belong to this device's Garmin connection, not to the training data */
export const GARMIN_SETTING_KEYS = ['garminApiKey', 'garminLastSyncAt'] as const;

/** Settings that belong to this device's cloud backup setup */
export const BACKUP_SETTING_KEYS = ['backupKey', 'lastCloudBackupAt', 'lastCloudBackupHash'] as const;

/** Device-only settings: never exported, imported or reset */
export const DEVICE_SETTING_KEYS = [...GARMIN_SETTING_KEYS, ...BACKUP_SETTING_KEYS] as const;
