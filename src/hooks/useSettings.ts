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
};

/**
 * Get a single setting value
 */
export function useSetting<K extends keyof SettingsMap>(key: K): SettingsMap[K] {
  const value = useLiveQuery(
    async () => {
      const setting = await db.settings.get(key);
      return setting?.value as SettingsMap[K] | undefined;
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
  const [exercises, templates, routines, sessions, sessionExercises, sets, prs, settings] =
    await Promise.all([
      db.exercises.toArray(),
      db.templates.toArray(),
      db.routines.toArray(),
      db.sessions.toArray(),
      db.sessionExercises.toArray(),
      db.sets.toArray(),
      db.prs.toArray(),
      db.settings.toArray(),
    ]);

  const data = {
    version: 4, // Updated for v1.4
    exportedAt: new Date().toISOString(),
    exercises,
    templates,
    routines,
    sessions,
    sessionExercises,
    sets,
    prs,
    settings,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON
 */
export async function importData(json: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(json);

    if (!data.version || (data.version !== 1 && data.version !== 2 && data.version !== 3 && data.version !== 4)) {
      return { success: false, message: 'Invalid or unsupported data format' };
    }

    // Clear existing data
    await Promise.all([
      db.exercises.clear(),
      db.templates.clear(),
      db.routines.clear(),
      db.sessions.clear(),
      db.sessionExercises.clear(),
      db.sets.clear(),
      db.prs.clear(),
      db.settings.clear(),
    ]);

    // Import new data
    await Promise.all([
      data.exercises?.length > 0 && db.exercises.bulkAdd(data.exercises),
      data.templates?.length > 0 && db.templates.bulkAdd(data.templates),
      data.routines?.length > 0 && db.routines.bulkAdd(data.routines),
      data.sessions?.length > 0 && db.sessions.bulkAdd(data.sessions),
      data.sessionExercises?.length > 0 && db.sessionExercises.bulkAdd(data.sessionExercises),
      data.sets?.length > 0 && db.sets.bulkAdd(data.sets),
      data.prs?.length > 0 && db.prs.bulkAdd(data.prs),
      data.settings?.length > 0 && db.settings.bulkAdd(data.settings),
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
  ]);
}
