import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Run, RunKind } from '../types';
import { computeRunRecords } from '../utils/runStats';

/** runId → best-time distances that run set (e.g. ["5 km"]) */
export function useRunRecords(): Map<string, string[]> | undefined {
  return useLiveQuery(async () => computeRunRecords(await db.runs.toArray()), []);
}

/** All runs, newest first (`undefined` while loading) */
export function useRuns(): Run[] | undefined {
  return useLiveQuery(() => db.runs.orderBy('startedAt').reverse().toArray(), []);
}

/** A single run; null when it doesn't exist (vs undefined while loading) */
export function useRun(id: string | undefined): Run | null | undefined {
  return useLiveQuery(async () => (id ? (await db.runs.get(id)) ?? null : null), [id]);
}

export interface ManualRunInput {
  name?: string;
  kind: RunKind;
  startedAt: number;
  distance: number; // meters
  movingTime: number; // seconds
  averageHeartrate?: number;
  notes?: string;
}

export async function createManualRun(input: ManualRunInput): Promise<string> {
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.runs.add({
    id,
    source: 'manual',
    name: input.name?.trim() || defaultRunName(input.startedAt),
    kind: input.kind,
    startedAt: input.startedAt,
    distance: input.distance,
    movingTime: input.movingTime,
    averageHeartrate: input.averageHeartrate,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateRunNotes(id: string, notes: string): Promise<void> {
  await db.runs.update(id, { notes: notes.trim() || undefined, updatedAt: Date.now() });
}

export async function deleteRun(id: string): Promise<void> {
  await db.runs.delete(id);
}

/** "Morning Run" / "Evening Run", like Strava names them */
export function defaultRunName(startedAt: number): string {
  const h = new Date(startedAt).getHours();
  const part = h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
  return `${part} Run`;
}
