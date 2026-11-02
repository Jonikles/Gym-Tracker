import { useLiveQuery } from 'dexie-react-hooks';
import { db, SCHEMA_VERSION } from '../db';
import { STRAVA_SETTING_KEYS, type SettingsMap } from '../types';

/**
 * Default settings values (also used by seed.ts on fresh installs)
 */
export const defaultSettings: SettingsMap = {
  weightIncrement: 2.5,
  weekStartDay: 0, // Sunday
  activeRoutineId: null, // No active routine by default
  bodyweight: 0, // 0 = not set
  activeRoutineSetAt: null,
  lastAutoSkipCheckAt: null,
  stravaAuth: null,
  stravaPendingState: null,
  stravaLastSyncAt: null,
};

const isStravaKey = (key: string) => (STRAVA_SETTING_KEYS as readonly string[]).includes(key);

/**
 * Get a single setting value
 */
export function useSetting<K extends keyof SettingsMap>(key: K): SettingsMap[K] {
  const value = useLiveQuery(
    async () => {
      const setting = await db.settings.get(key);
      if (setting === undefined) return undefined;

      // Runtime type validation — if DB value doesn't match expected type, discard it
      const defaultValue = defaultSettings[key];
      if (defaultValue !== null && typeof setting.value !== typeof defaultValue) {
        console.warn(`Setting "${key}" has wrong type in DB (expected ${typeof defaultValue}, got ${typeof setting.value}). Using default.`);
        return undefined;
      }
      return setting.value as SettingsMap[K];
    },
    [key]
  );

  return value ?? defaultSettings[key];
}

/**
 * Get all settings
 */
export function useSettings(): SettingsMap {
  const settings = useLiveQuery(async () => {
    const all = await db.settings.toArray();
    const map: Partial<SettingsMap> = {};
    for (const s of all) {
      (map as Record<string, unknown>)[s.key] = s.value;
    }
    return map;
  }, []);

  return { ...defaultSettings, ...settings };
}

/**
 * Update a setting
 */
export async function updateSetting<K extends keyof SettingsMap>(
  key: K,
  value: SettingsMap[K]
): Promise<void> {
  await db.settings.put({
    key,
    value,
    updatedAt: Date.now(),
  });
}

/**
 * Reset all settings to defaults (the Strava connection is kept)
 */
export async function resetSettings(): Promise<void> {
  await db.settings.filter((s) => !isStravaKey(s.key)).delete();
}

/**
 * Export all data as JSON
 */
export async function exportData(): Promise<string> {
  const [exercises, templates, routines, sessions, sessionExercises, sets, prs, settings, tasks, runs] =
    await Promise.all([
      db.exercises.toArray(),
      db.templates.toArray(),
      db.routines.toArray(),
      db.sessions.toArray(),
      db.sessionExercises.toArray(),
      db.sets.toArray(),
      db.prs.toArray(),
      // Strava tokens stay on this device — never in a backup file
      db.settings.filter((s) => !isStravaKey(s.key)).toArray(),
      db.tasks.toArray(),
      db.runs.toArray(),
    ]);

  const data = {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    exercises,
    templates,
    routines,
    sessions,
    sessionExercises,
    sets,
    prs,
    settings,
    tasks,
    runs,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON
 */
export async function importData(json: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(json);

    // Accept any export from schema v1 up to the current schema version
    if (
      typeof data.version !== 'number' ||
      !Number.isInteger(data.version) ||
      data.version < 1 ||
      data.version > SCHEMA_VERSION
    ) {
      return { success: false, message: 'Invalid or unsupported data format' };
    }

    // Validate data structure before clearing anything
    const errors: string[] = [];

    const validateArray = (name: string, arr: unknown) => {
      if (arr !== undefined && !Array.isArray(arr)) {
        errors.push(`${name} must be an array`);
      }
    };

    validateArray('exercises', data.exercises);
    validateArray('templates', data.templates);
    validateArray('routines', data.routines);
    validateArray('sessions', data.sessions);
    validateArray('sessionExercises', data.sessionExercises);
    validateArray('sets', data.sets);
    validateArray('prs', data.prs);
    validateArray('settings', data.settings);
    validateArray('tasks', data.tasks);
    validateArray('runs', data.runs);

    // Validate required fields on key entities
    if (Array.isArray(data.exercises)) {
      for (const e of data.exercises) {
        if (!e.id || !e.name) {
          errors.push('Exercise missing required fields (id, name)');
          break;
        }
      }
    }

    if (Array.isArray(data.sessions)) {
      for (const s of data.sessions) {
        if (!s.id || typeof s.startedAt !== 'number') {
          errors.push('Session missing required fields (id, startedAt)');
          break;
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, message: `Invalid data: ${errors.join('; ')}` };
    }

    // Validation passed — now clear and import atomically: if any write fails,
    // the whole transaction rolls back and the existing data is left untouched.
    await db.transaction(
      'rw',
      [db.exercises, db.templates, db.routines, db.sessions, db.sessionExercises, db.sets, db.prs, db.settings, db.tasks, db.runs],
      async () => {
        await Promise.all([
          db.exercises.clear(),
          db.templates.clear(),
          db.routines.clear(),
          db.sessions.clear(),
          db.sessionExercises.clear(),
          db.sets.clear(),
          db.prs.clear(),
          // Keep this device's Strava connection, but re-sync from scratch so
          // Strava runs missing from the backup come back on the next sync
          db.settings.filter((s) => !isStravaKey(s.key) || s.key === 'stravaLastSyncAt').delete(),
          db.tasks.clear(),
          db.runs.clear(),
        ]);

        const importedSettings = Array.isArray(data.settings)
          ? data.settings.filter((s: { key?: unknown }) => typeof s.key === 'string' && !isStravaKey(s.key))
          : [];

        await Promise.all([
          data.exercises?.length > 0 && db.exercises.bulkAdd(data.exercises),
          data.templates?.length > 0 && db.templates.bulkAdd(data.templates),
          data.routines?.length > 0 && db.routines.bulkAdd(data.routines),
          data.sessions?.length > 0 && db.sessions.bulkAdd(data.sessions),
          data.sessionExercises?.length > 0 && db.sessionExercises.bulkAdd(data.sessionExercises),
          data.sets?.length > 0 && db.sets.bulkAdd(data.sets),
          data.prs?.length > 0 && db.prs.bulkAdd(data.prs),
          importedSettings.length > 0 && db.settings.bulkAdd(importedSettings),
          data.tasks?.length > 0 && db.tasks.bulkAdd(data.tasks),
          data.runs?.length > 0 && db.runs.bulkAdd(data.runs),
        ]);
      }
    );

    return { success: true, message: 'Data imported successfully' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to import data',
    };
  }
}

/**
 * Clear all user data (keeps preset exercises)
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.sessions.clear(),
    db.sessionExercises.clear(),
    db.sets.clear(),
    db.prs.clear(),
    db.runs.clear(),
    db.settings.delete('stravaLastSyncAt'), // so Strava runs can be synced again
  ]);
}

/**
 * Factory reset (clears everything including exercises)
 */
export async function factoryReset(): Promise<void> {
  await Promise.all([
    db.exercises.clear(),
    db.templates.clear(),
    db.routines.clear(),
    db.sessions.clear(),
    db.sessionExercises.clear(),
    db.sets.clear(),
    db.prs.clear(),
    db.settings.clear(),
    db.tasks.clear(),
    db.runs.clear(),
  ]);
}
