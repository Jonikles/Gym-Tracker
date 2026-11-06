import { db } from '../db';
import type { Run, RunKind, SettingsMap } from '../types';
import { computeRunRecords } from './runStats';

/**
 * Garmin connection + run sync, via Garmin's Personal API. All traffic goes
 * through the app's Vercel function (api/garmin.ts), which also turns each
 * run's FIT file into splits and best efforts. The user's Personal API key is
 * stored on this device only (see GARMIN_SETTING_KEYS).
 */

const FUNCTION_URL = '/api/garmin';
/** Where the user creates their Personal API key */
export const GARMIN_KEY_URL = 'https://connect.garmin.com/app/settings/personalApiToken';
/** First sync looks back this far; later syncs only fetch newer runs */
const INITIAL_SYNC_DAYS = 365;
const PAGE_SIZE = 40;
/** Per-run FIT downloads per sync (splits / best efforts); the rest follow on later syncs */
const MAX_DETAIL_FETCHES = 15;

export class GarminError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GarminError';
    this.status = status;
  }
}

// ── Settings helpers (Garmin keys are device-only, see GARMIN_SETTING_KEYS) ──

async function getSetting<K extends keyof SettingsMap>(key: K): Promise<SettingsMap[K] | null> {
  const s = await db.settings.get(key);
  return (s?.value as SettingsMap[K] | undefined) ?? null;
}

async function setSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K]): Promise<void> {
  if (value === null) await db.settings.delete(key);
  else await db.settings.put({ key, value, updatedAt: Date.now() });
}

// ── Function calls ──

async function callFunction<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new GarminError("Couldn't reach the server. Check your connection.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || data === null) {
    const message = (data && typeof data.error === 'string' && data.error) || `Request failed (${res.status})`;
    throw new GarminError(message, res.status);
  }
  return data as T;
}

/** Local calendar date, YYYY-MM-DD (Garmin filters on the run's local start date) */
function isoDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface GarminActivity {
  activityId: number;
  activityName?: string;
  typeKey?: string;
  startTimeGMT?: string; // "yyyy-MM-dd HH:mm:ss", UTC
  distance?: number;
  duration?: number;
  movingDuration?: number;
  elapsedDuration?: number;
  averageHR?: number;
  maxHR?: number;
  elevationGain?: number;
  averageRunningCadenceInStepsPerMinute?: number;
}

interface GarminDetails {
  splits: NonNullable<Run['splits']>;
  bestEfforts: NonNullable<Run['bestEfforts']>;
  averageCadence?: number;
  movingTime?: number;
}

async function listRuns(key: string, from: number, to: number, start: number): Promise<GarminActivity[]> {
  const { activities } = await callFunction<{ activities: GarminActivity[] }>({
    action: 'list',
    key,
    startDate: isoDate(from),
    endDate: isoDate(to),
    start,
    limit: PAGE_SIZE,
  });
  return activities;
}

// ── Connecting ──

/** Check a Personal API key against Garmin and save it */
export async function connectGarmin(rawKey: string): Promise<void> {
  const key = rawKey.trim();
  if (!key) throw new GarminError('Paste your Garmin API key');
  await listRuns(key, Date.now() - 7 * 86400000, Date.now() + 86400000, 0);
  await setSetting('garminApiKey', key);
}

export async function disconnectGarmin(): Promise<void> {
  await setSetting('garminApiKey', null);
}

// ── Mapping ──

const round1 = (n: number | undefined) => (n == null ? undefined : Math.round(n * 10) / 10);

function runKind(typeKey: string | undefined): RunKind {
  if (typeKey === 'trail_running') return 'trail';
  if (typeKey && /treadmill|indoor|virtual/.test(typeKey)) return 'treadmill';
  return 'road';
}

/** "yyyy-MM-dd HH:mm:ss" in UTC → ms */
function parseGmt(s: string | undefined): number | null {
  if (!s) return null;
  const ms = Date.parse(`${s.replace(' ', 'T')}Z`);
  return Number.isFinite(ms) ? ms : null;
}

function summaryFields(a: GarminActivity, startedAt: number) {
  const moving = a.movingDuration ?? a.duration ?? 0;
  return {
    name: a.activityName?.trim() || 'Run',
    kind: runKind(a.typeKey),
    startedAt,
    distance: a.distance ?? 0,
    movingTime: Math.round(moving),
    elapsedTime: a.elapsedDuration != null ? Math.round(a.elapsedDuration) : undefined,
    averageHeartrate: round1(a.averageHR),
    maxHeartrate: a.maxHR,
    averageCadence:
      a.averageRunningCadenceInStepsPerMinute != null ? Math.round(a.averageRunningCadenceInStepsPerMinute) : undefined,
    elevationGain: round1(a.elevationGain),
  };
}

// ── Sync ──

export interface SyncResult {
  added: number;
  updated: number;
  /** Runs still waiting for splits / best efforts (fetched on later syncs) */
  detailsPending: number;
  /** Best times set by the newly added runs, e.g. ["5 km"] */
  newRecords: string[];
}

async function requireKey(): Promise<string> {
  const key = await getSetting('garminApiKey');
  if (!key) throw new GarminError('Garmin is not connected.');
  return key;
}

/** Pull new runs from Garmin, then fill in splits / best efforts for a batch of runs */
export async function syncGarminRuns(): Promise<SyncResult> {
  const key = await requireKey();
  const lastSyncAt = await getSetting('garminLastSyncAt');
  // Re-check the last 3 days so edits made in Garmin Connect right after a run come through
  const from = lastSyncAt ? lastSyncAt - 3 * 86400000 : Date.now() - INITIAL_SYNC_DAYS * 86400000;
  const to = Date.now() + 86400000; // tomorrow: covers time zones ahead of the server

  let added = 0;
  let updated = 0;
  let newest = lastSyncAt ?? 0;
  const addedIds = new Set<string>();

  for (let page = 0; page < 50; page++) {
    const activities = await listRuns(key, from, to, page * PAGE_SIZE);
    for (const a of activities) {
      const startedAt = parseGmt(a.startTimeGMT);
      if (startedAt === null) continue;
      const fields = summaryFields(a, startedAt);
      newest = Math.max(newest, startedAt);
      const existing = await db.runs.where('garminId').equals(a.activityId).first();
      const now = Date.now();
      if (existing) {
        // Keep the FIT-derived moving time / cadence once details are in
        const { movingTime, averageCadence, ...rest } = fields;
        await db.runs.update(existing.id, {
          ...rest,
          ...(existing.detailsFetched ? {} : { movingTime, averageCadence }),
          updatedAt: now,
        });
        updated++;
      } else {
        const id = crypto.randomUUID();
        addedIds.add(id);
        await db.runs.add({ id, source: 'garmin', garminId: a.activityId, ...fields, createdAt: now, updatedAt: now });
        added++;
      }
    }
    if (activities.length < PAGE_SIZE) break;
  }
  if (newest > 0) await setSetting('garminLastSyncAt', newest);

  // Splits / best efforts need the run's FIT file: newest first, a batch per sync
  const needDetails = await db.runs
    .orderBy('startedAt')
    .reverse()
    .filter((r) => r.source === 'garmin' && !r.detailsFetched && r.garminId != null)
    .toArray();
  let fetched = 0;
  for (const run of needDetails.slice(0, MAX_DETAIL_FETCHES)) {
    try {
      const d = await callFunction<GarminDetails>({ action: 'details', key, activityId: run.garminId });
      await db.runs.update(run.id, {
        splits: d.splits,
        bestEfforts: d.bestEfforts,
        ...(d.movingTime ? { movingTime: d.movingTime } : {}),
        ...(d.averageCadence ? { averageCadence: d.averageCadence } : {}),
        detailsFetched: true,
        updatedAt: Date.now(),
      });
      fetched++;
    } catch (err) {
      if (err instanceof GarminError && err.status === 404) {
        // Deleted on Garmin — keep the summary, stop asking
        await db.runs.update(run.id, { detailsFetched: true });
        fetched++;
        continue;
      }
      if (err instanceof GarminError && err.status === 429) break; // try the rest next time
      throw err;
    }
  }

  // Best times set by this sync's new runs (needs their best efforts, fetched above)
  const newRecords = new Set<string>();
  if (addedIds.size > 0) {
    for (const [runId, labels] of computeRunRecords(await db.runs.toArray())) {
      if (addedIds.has(runId)) labels.forEach((l) => newRecords.add(l));
    }
  }

  return { added, updated, detailsPending: needDetails.length - fetched, newRecords: [...newRecords] };
}
