import { db } from '../db';
import type { Run, RunBestEffort, RunKind, RunSplit, SettingsMap, StravaAuth } from '../types';

/**
 * Strava connection + run sync. All Strava traffic goes through the app's
 * Netlify function (netlify/functions/strava.mts), which holds the client secret.
 */

const FUNCTION_URL = '/.netlify/functions/strava';
const CALLBACK_PATH = '/strava-callback';
/** First sync looks back this far; later syncs only fetch newer runs */
const INITIAL_SYNC_DAYS = 365;
/** Per-run detail requests per sync (splits / best efforts) — keeps well inside Strava's rate limits */
const MAX_DETAIL_FETCHES = 25;
const RUN_SPORT_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);

export class StravaError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'StravaError';
    this.status = status;
  }
}

// ── Settings helpers (Strava keys are device-only, see STRAVA_SETTING_KEYS) ──

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
    throw new StravaError("Couldn't reach the server. Check your connection.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && typeof data.error === 'string' && data.error) || `Request failed (${res.status})`;
    throw new StravaError(message, res.status);
  }
  return data as T;
}

// ── Connecting ──

/** Send the user to Strava to approve access; they come back to /strava-callback */
export async function startStravaConnect(): Promise<void> {
  const { clientId } = await callFunction<{ clientId: string }>({ action: 'config' }).catch((err) => {
    if (err instanceof StravaError && (err.status === 404 || err.status === 500)) {
      throw new StravaError("Strava sync isn't set up on the server yet (see the setup steps).", err.status);
    }
    throw err;
  });
  const state = crypto.randomUUID();
  await setSetting('stravaPendingState', state);

  const url = new URL('https://www.strava.com/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', window.location.origin + CALLBACK_PATH);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('approval_prompt', 'auto');
  url.searchParams.set('scope', 'activity:read_all');
  url.searchParams.set('state', state);
  window.location.assign(url.toString());
}

/**
 * Handle Strava's redirect. Returns 'connected' when this browser started the
 * sign-in, or 'handoff' when it finished somewhere else (e.g. Safari instead of
 * the home-screen app) — the app then picks the tokens up via claimPendingStravaAuth.
 */
export async function completeStravaCallback(params: URLSearchParams): Promise<'connected' | 'handoff'> {
  const error = params.get('error');
  if (error) throw new StravaError(error === 'access_denied' ? 'Strava access was not granted.' : `Strava error: ${error}`);
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) throw new StravaError('Strava did not return a sign-in code.');
  if (!(params.get('scope') ?? '').includes('activity:read')) {
    throw new StravaError('Please allow access to your activities so runs can be synced.');
  }

  const tokens = await callFunction<StravaAuth>({ action: 'exchange', code, state });
  const pending = await getSetting('stravaPendingState');
  if (pending !== state) return 'handoff';

  await setSetting('stravaAuth', tokens);
  await setSetting('stravaPendingState', null);
  return 'connected';
}

/** If a sign-in finished in another browser context, fetch its tokens (once) */
export async function claimPendingStravaAuth(): Promise<boolean> {
  const [pending, auth] = await Promise.all([getSetting('stravaPendingState'), getSetting('stravaAuth')]);
  if (!pending || auth) return false;
  try {
    const tokens = await callFunction<StravaAuth>({ action: 'claim', state: pending });
    await setSetting('stravaAuth', tokens);
    await setSetting('stravaPendingState', null);
    return true;
  } catch (err) {
    // 404: not finished yet (keep waiting); 410/400: gone for good
    if (err instanceof StravaError && (err.status === 410 || err.status === 400)) {
      await setSetting('stravaPendingState', null);
    }
    return false;
  }
}

export async function disconnectStrava(): Promise<void> {
  const auth = await getSetting('stravaAuth');
  if (auth) {
    // Best effort: revoke on Strava's side too
    await callFunction({ action: 'deauthorize', accessToken: auth.accessToken }).catch(() => undefined);
  }
  await setSetting('stravaAuth', null);
  await setSetting('stravaPendingState', null);
}

async function getAccessToken(): Promise<string> {
  const auth = await getSetting('stravaAuth');
  if (!auth) throw new StravaError('Strava is not connected.');
  if (auth.expiresAt - 60 > Date.now() / 1000) return auth.accessToken;

  try {
    const fresh = await callFunction<StravaAuth>({ action: 'refresh', refreshToken: auth.refreshToken });
    await setSetting('stravaAuth', { ...fresh, athlete: fresh.athlete ?? auth.athlete });
    return fresh.accessToken;
  } catch (err) {
    if (err instanceof StravaError && (err.status === 400 || err.status === 401)) {
      // Access was revoked on Strava's side
      await setSetting('stravaAuth', null);
      throw new StravaError('Strava access has expired. Please connect again.');
    }
    throw err;
  }
}

async function stravaGet<T>(path: string, query?: Record<string, string | number>): Promise<T> {
  const accessToken = await getAccessToken();
  try {
    return await callFunction<T>({ action: 'api', accessToken, path, query });
  } catch (err) {
    if (err instanceof StravaError && err.status === 429) {
      throw new StravaError('Strava rate limit reached — try again in 15 minutes.', 429);
    }
    if (err instanceof StravaError && err.status === 401) {
      await setSetting('stravaAuth', null);
      throw new StravaError('Strava access has expired. Please connect again.', 401);
    }
    throw err;
  }
}

// ── Mapping Strava activities to runs ──

interface StravaSummaryActivity {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string; // ISO, UTC
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number; // Strava reports one foot (rpm) for runs
  trainer?: boolean;
}

interface StravaDetailedActivity extends StravaSummaryActivity {
  splits_metric?: {
    distance: number;
    moving_time: number;
    average_heartrate?: number;
    elevation_difference?: number;
  }[];
  best_efforts?: { name: string; distance: number; moving_time: number }[];
}

function isRunActivity(a: StravaSummaryActivity): boolean {
  return RUN_SPORT_TYPES.has(a.sport_type ?? a.type ?? '');
}

function runKind(a: StravaSummaryActivity): RunKind {
  if ((a.sport_type ?? a.type) === 'TrailRun') return 'trail';
  if (a.trainer || (a.sport_type ?? a.type) === 'VirtualRun') return 'treadmill';
  return 'road';
}

const round1 = (n: number | undefined) => (n == null ? undefined : Math.round(n * 10) / 10);

function summaryFields(a: StravaSummaryActivity) {
  return {
    name: a.name,
    kind: runKind(a),
    startedAt: Date.parse(a.start_date),
    distance: a.distance,
    movingTime: a.moving_time,
    elapsedTime: a.elapsed_time,
    averageHeartrate: round1(a.average_heartrate),
    maxHeartrate: a.max_heartrate,
    averageCadence: a.average_cadence != null ? Math.round(a.average_cadence * 2) : undefined,
    elevationGain: round1(a.total_elevation_gain),
  };
}

function detailFields(a: StravaDetailedActivity): Pick<Run, 'splits' | 'bestEfforts' | 'detailsFetched'> {
  const splits: RunSplit[] = (a.splits_metric ?? []).map((s) => ({
    distance: s.distance,
    movingTime: s.moving_time,
    averageHeartrate: round1(s.average_heartrate),
    elevationDifference: round1(s.elevation_difference),
  }));
  const bestEfforts: RunBestEffort[] = (a.best_efforts ?? []).map((b) => ({
    name: b.name,
    distance: b.distance,
    movingTime: b.moving_time,
  }));
  return { splits, bestEfforts, detailsFetched: true };
}

// ── Sync ──

export interface SyncResult {
  added: number;
  updated: number;
  /** Runs still waiting for splits / best efforts (fetched on later syncs) */
  detailsPending: number;
}

/** Pull new runs from Strava, then fill in splits / best efforts for a batch of runs */
export async function syncStravaRuns(): Promise<SyncResult> {
  const lastSyncAt = await getSetting('stravaLastSyncAt');
  // Re-check the last 3 days so edits made on Strava right after a run (title, crop) come through
  const after = lastSyncAt
    ? Math.floor(lastSyncAt / 1000) - 3 * 86400
    : Math.floor(Date.now() / 1000) - INITIAL_SYNC_DAYS * 86400;

  let added = 0;
  let updated = 0;
  let newest = lastSyncAt ?? 0;

  for (let page = 1; page <= 20; page++) {
    const activities = await stravaGet<StravaSummaryActivity[]>('/athlete/activities', {
      after,
      page,
      per_page: 100,
    });
    for (const a of activities.filter(isRunActivity)) {
      const fields = summaryFields(a);
      newest = Math.max(newest, fields.startedAt);
      const existing = await db.runs.where('stravaId').equals(a.id).first();
      const now = Date.now();
      if (existing) {
        await db.runs.update(existing.id, { ...fields, updatedAt: now });
        updated++;
      } else {
        await db.runs.add({
          id: crypto.randomUUID(),
          source: 'strava',
          stravaId: a.id,
          ...fields,
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }
    }
    if (activities.length < 100) break;
  }
  if (newest > 0) await setSetting('stravaLastSyncAt', newest);

  // Detailed data needs one request per run: newest first, a batch per sync
  const needDetails = await db.runs
    .orderBy('startedAt')
    .reverse()
    .filter((r) => r.source === 'strava' && !r.detailsFetched && r.stravaId != null)
    .toArray();
  let fetched = 0;
  for (const run of needDetails.slice(0, MAX_DETAIL_FETCHES)) {
    try {
      const detail = await stravaGet<StravaDetailedActivity>(`/activities/${run.stravaId}`);
      await db.runs.update(run.id, { ...detailFields(detail), updatedAt: Date.now() });
      fetched++;
    } catch (err) {
      if (err instanceof StravaError && err.status === 404) {
        // Deleted on Strava — keep the summary, stop asking
        await db.runs.update(run.id, { detailsFetched: true });
        fetched++;
        continue;
      }
      if (err instanceof StravaError && err.status === 429) break; // try the rest next time
      throw err;
    }
  }

  return { added, updated, detailsPending: needDetails.length - fetched };
}
