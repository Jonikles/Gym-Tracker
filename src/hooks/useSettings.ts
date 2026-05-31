import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { SettingsMap } from '../types';

/**
 * Default settings values
 * v1.2: Removed theme (dark mode only)
 * v1.4: Added activeRoutineId
 */
export const defaultSettings: SettingsMap = {
  weightIncrement: 2.5,
  weekStartDay: 0, // Sunday
  activeRoutineId: null, // v1.4: No active routine by default
  restTimerDuration: 90, // 90 seconds default rest
  restTimerSound: true,
  restTimerVibrate: true,
  bodyweight: 0, // 0 = not set
  theme: 'dark',
};

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
 * Reset all settings to defaults
 */
export async function resetSettings(): Promise<void> {
  await db.settings.clear();
}

/**
 * Export all data as JSON
 */
export async function exportData(): Promise<string> {
  const [exercises, templates, routines, sessions, sessionExercises, sets, prs, settings, measurements] =
    await Promise.all([
      db.exercises.toArray(),
      db.templates.toArray(),
      db.routines.toArray(),
      db.sessions.toArray(),
      db.sessionExercises.toArray(),
      db.sets.toArray(),
      db.prs.toArray(),
      db.settings.toArray(),
      db.measurements.toArray(),
    ]);

  const data = {
    version: 6,
    exportedAt: new Date().toISOString(),
    exercises,
    templates,
    routines,
    sessions,
    sessionExercises,
    sets,
    prs,
    settings,
    measurements,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON
 */
export async function importData(json: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(json);

    if (!data.version || ![1, 2, 3, 4, 5, 6].includes(data.version)) {
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
    validateArray('measurements', data.measurements);

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

    // Validation passed — now clear and import
    await Promise.all([
      db.exercises.clear(),
      db.templates.clear(),
      db.routines.clear(),
      db.sessions.clear(),
      db.sessionExercises.clear(),
      db.sets.clear(),
      db.prs.clear(),
      db.settings.clear(),
      db.measurements.clear(),
    ]);

    await Promise.all([
      data.exercises?.length > 0 && db.exercises.bulkAdd(data.exercises),
      data.templates?.length > 0 && db.templates.bulkAdd(data.templates),
      data.routines?.length > 0 && db.routines.bulkAdd(data.routines),
      data.sessions?.length > 0 && db.sessions.bulkAdd(data.sessions),
      data.sessionExercises?.length > 0 && db.sessionExercises.bulkAdd(data.sessionExercises),
      data.sets?.length > 0 && db.sets.bulkAdd(data.sets),
      data.prs?.length > 0 && db.prs.bulkAdd(data.prs),
      data.settings?.length > 0 && db.settings.bulkAdd(data.settings),
      data.measurements?.length > 0 && db.measurements.bulkAdd(data.measurements),
    ]);

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
    db.measurements.clear(),
  ]);
}
