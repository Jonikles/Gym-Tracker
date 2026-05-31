import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { BodyMeasurement } from '../types';

/**
 * Get all measurements sorted by date (newest first)
 */
export function useMeasurements() {
  return useLiveQuery(
    () => db.measurements.orderBy('date').reverse().toArray(),
    []
  );
}

/**
 * Get the latest measurement entry
 */
export function useLatestMeasurement() {
  return useLiveQuery(
    () => db.measurements.orderBy('date').reverse().first(),
    []
  );
}

/**
 * Get a single measurement by ID
 */
export function useMeasurement(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.measurements.get(id) : undefined),
    [id]
  );
}

/**
 * Create a new measurement entry
 */
export async function createMeasurement(
  data: Omit<BodyMeasurement, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.measurements.add({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/**
 * Update an existing measurement entry
 */
export async function updateMeasurement(
  id: string,
  data: Partial<Omit<BodyMeasurement, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await db.measurements.update(id, {
    ...data,
    updatedAt: Date.now(),
  });
}

/**
 * Delete a measurement entry
 */
export async function deleteMeasurement(id: string): Promise<void> {
  await db.measurements.delete(id);
}
