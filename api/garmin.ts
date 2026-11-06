/**
 * Garmin proxy — Vercel function at /api/garmin
 *
 * Relays the app's calls to Garmin's Personal API (developer.garmin.com/gc-developer-program/personal)
 * using the user's own Personal API key, which the app sends with each request
 * and which is never stored here. Garmin's API has no browser (CORS) support,
 * and the run's FIT file is parsed here so the app only receives the numbers.
 *
 *   POST { action: 'list', key, startDate, endDate, start, limit } → running activities (summaries)
 *   POST { action: 'details', key, activityId }                   → km splits, best efforts, cadence
 */
import { Decoder, Stream, type EventMesg, type RecordMesg, type SessionMesg } from '@garmin/fitsdk';
import { unzipSync } from 'fflate';
import { createHash } from 'node:crypto';

const BASE = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const SEARCH_PATH = '/activitylist-service/activities/search/activities';
const DOWNLOAD_PATH = '/download-service/files/activity';
/** Activity search answers 500 above ~45 per page */
const MAX_PAGE = 40;
/** Renew a cached token when less than this remains */
const TOKEN_MARGIN_MS = 60 * 60 * 1000;

class GarminError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// ── Auth: API key → 24 h access token (a raw JWT; no refresh tokens) ──

const tokenCache = new Map<string, { token: string; expiresAt: number }>();
const fingerprint = (key: string) => createHash('sha256').update(key).digest('hex');

function jwtExpiry(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { exp?: number };
    if (typeof payload.exp === 'number') return payload.exp * 1000;
  } catch {
    // fall through
  }
  return Date.now() + 12 * 60 * 60 * 1000;
}

async function getToken(key: string, fresh = false): Promise<string> {
  const id = fingerprint(key);
  const cached = tokenCache.get(id);
  if (!fresh && cached && cached.expiresAt - TOKEN_MARGIN_MS > Date.now()) return cached.token;

  const res = await fetch(BASE + TOKEN_PATH, {
    method: 'POST',
    headers: { Authorization: `ApiKey ${key}`, Accept: '*/*' },
  });
  if (res.status === 401 || res.status === 403) {
    tokenCache.delete(id);
    throw new GarminError('Garmin rejected the API key — it may have expired or been deleted', 401);
  }
  if (!res.ok) throw new GarminError(`Garmin sign-in failed (${res.status})`, 502);
  const token = (await res.text()).trim();
  if (!token) throw new GarminError('Garmin returned no access token', 502);
  tokenCache.set(id, { token, expiresAt: jwtExpiry(token) });
  return token;
}

async function garminGet(key: string, path: string, accept: string): Promise<Response> {
  for (const fresh of [false, true]) {
    const token = await getToken(key, fresh);
    const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${token}`, Accept: accept } });
    if (res.status === 401 && !fresh) continue; // token revoked early — get a new one once
    if (res.status === 401) throw new GarminError('Garmin rejected the API key — it may have expired or been deleted', 401);
    if (res.status === 429) throw new GarminError('Garmin rate limit reached — try again later', 429);
    if (res.status === 404) throw new GarminError('Not found on Garmin', 404);
    if (!res.ok) throw new GarminError(`Garmin request failed (${res.status})`, 502);
    return res;
  }
  throw new GarminError('Garmin request failed', 502);
}

// ── Activity list ──

/** The fields the app uses from Garmin's activity summaries */
export interface GarminActivity {
  activityId: number;
  activityName?: string;
  typeKey?: string;
  startTimeGMT?: string; // "yyyy-MM-dd HH:mm:ss", UTC
  distance?: number; // meters
  duration?: number; // seconds
  movingDuration?: number; // seconds
  elapsedDuration?: number; // seconds
  averageHR?: number;
  maxHR?: number;
  elevationGain?: number; // meters
  averageRunningCadenceInStepsPerMinute?: number;
}

type Raw = Record<string, unknown>;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

function pickActivity(a: Raw): GarminActivity | null {
  const activityId = num(a.activityId);
  if (activityId === undefined) return null;
  const type = (a.activityType ?? {}) as Raw;
  return {
    activityId,
    activityName: str(a.activityName),
    typeKey: str(type.typeKey),
    startTimeGMT: str(a.startTimeGMT),
    distance: num(a.distance),
    duration: num(a.duration),
    movingDuration: num(a.movingDuration),
    elapsedDuration: num(a.elapsedDuration),
    averageHR: num(a.averageHR),
    maxHR: num(a.maxHR),
    elevationGain: num(a.elevationGain),
    averageRunningCadenceInStepsPerMinute: num(a.averageRunningCadenceInStepsPerMinute),
  };
}

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

async function listRuns(key: string, body: Raw): Promise<GarminActivity[]> {
  if (!isDate(body.startDate) || !isDate(body.endDate)) throw new GarminError('Invalid date range', 400);
  const start = Math.max(0, Math.floor(num(body.start) ?? 0));
  const limit = Math.min(MAX_PAGE, Math.max(1, Math.floor(num(body.limit) ?? MAX_PAGE)));
  const query = new URLSearchParams({
    start: String(start),
    limit: String(limit),
    startDate: body.startDate,
    endDate: body.endDate,
    activityType: 'running',
  });
  const res = await garminGet(key, `${SEARCH_PATH}?${query}`, 'application/json');
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new GarminError('Unexpected response from Garmin', 502);
  return data.map((a) => pickActivity(a as Raw)).filter((a): a is GarminActivity => a !== null);
}

// ── FIT analysis: km splits and best efforts ──

export interface RunDetails {
  splits: { distance: number; movingTime: number; averageHeartrate?: number; elevationDifference?: number }[];
  bestEfforts: { name: string; distance: number; movingTime: number }[];
  averageCadence?: number; // steps per minute
  movingTime?: number; // seconds (timer time)
}

/** Names match BEST_TIME_DISTANCES[].effortName in src/utils/runStats.ts */
const EFFORTS = [
  { name: '1k', meters: 1000 },
  { name: '5k', meters: 5000 },
  { name: '10k', meters: 10000 },
  { name: 'Half-Marathon', meters: 21097.5 },
];

const STOP_EVENTS = new Set(['stop', 'stopAll', 'stopDisable', 'stopDisableAll']);
const round1 = (n: number) => Math.round(n * 10) / 10;

interface Point {
  t: number; // moving seconds since start
  d: number; // meters
  hr?: number;
  alt?: number;
}

/** Records → points on a moving-time axis (paused periods removed) */
function toPoints(records: RecordMesg[], events: EventMesg[]): Point[] {
  const paused: [number, number][] = [];
  let pauseStart: number | null = null;
  const timerEvents = events
    .filter((e): e is EventMesg & { timestamp: Date } => e.event === 'timer' && e.timestamp instanceof Date)
    .sort((a, b) => +a.timestamp - +b.timestamp);
  for (const e of timerEvents) {
    const at = +e.timestamp;
    if (STOP_EVENTS.has(String(e.eventType)) && pauseStart === null) pauseStart = at;
    else if (e.eventType === 'start' && pauseStart !== null) {
      paused.push([pauseStart, at]);
      pauseStart = null;
    }
  }
  const pausedBetween = (a: number, b: number) =>
    paused.reduce((sum, [s, e]) => sum + Math.max(0, Math.min(b, e) - Math.max(a, s)), 0);

  const points: Point[] = [];
  let prevAt: number | null = null;
  let t = 0;
  for (const r of records) {
    if (!(r.timestamp instanceof Date) || typeof r.distance !== 'number') continue;
    const at = +r.timestamp;
    if (prevAt !== null) t += Math.max(0, at - prevAt - pausedBetween(prevAt, at)) / 1000;
    prevAt = at;
    const last = points[points.length - 1];
    if (last && r.distance < last.d) continue; // distance never goes backwards
    points.push({
      t,
      d: r.distance,
      hr: typeof r.heartRate === 'number' ? r.heartRate : undefined,
      alt: typeof r.enhancedAltitude === 'number' ? r.enhancedAltitude : typeof r.altitude === 'number' ? r.altitude : undefined,
    });
  }
  return points;
}

/** Moving time at an exact distance, interpolated between records */
function timeAtDistance(points: Point[], d: number, from = 0): { t: number; i: number } {
  let i = from;
  while (i < points.length - 1 && points[i + 1].d < d) i++;
  const a = points[i];
  const b = points[Math.min(i + 1, points.length - 1)];
  const frac = b.d > a.d ? (d - a.d) / (b.d - a.d) : 0;
  return { t: a.t + (b.t - a.t) * Math.min(1, Math.max(0, frac)), i };
}

function computeSplits(points: Point[]): RunDetails['splits'] {
  const total = points[points.length - 1].d;
  const splits: RunDetails['splits'] = [];
  let startD = 0;
  let start = timeAtDistance(points, 0);
  while (startD < total) {
    const endD = Math.min(startD + 1000, total);
    if (endD - startD < 50) break; // ignore a GPS crumb at the end
    const end = timeAtDistance(points, endD, start.i);
    const inSplit = points.filter((p) => p.d >= startD && p.d <= endD);
    const hrs = inSplit.map((p) => p.hr).filter((h): h is number => h !== undefined);
    const alts = inSplit.map((p) => p.alt).filter((a): a is number => a !== undefined);
    splits.push({
      distance: Math.round(endD - startD),
      movingTime: Math.round(end.t - start.t),
      averageHeartrate: hrs.length ? round1(hrs.reduce((s, h) => s + h, 0) / hrs.length) : undefined,
      elevationDifference: alts.length >= 2 ? round1(alts[alts.length - 1] - alts[0]) : undefined,
    });
    startD = endD;
    start = end;
  }
  return splits;
}

function computeBestEfforts(points: Point[]): RunDetails['bestEfforts'] {
  const total = points[points.length - 1].d;
  const efforts: RunDetails['bestEfforts'] = [];
  for (const { name, meters } of EFFORTS) {
    if (total < meters) continue;
    let best = Infinity;
    let i = 0;
    for (let j = 1; j < points.length; j++) {
      const startD = points[j].d - meters;
      if (startD < 0) continue;
      while (i < j - 1 && points[i + 1].d <= startD) i++;
      const t = points[j].t - timeAtDistance(points, startD, i).t;
      if (t > 0 && t < best) best = t;
    }
    if (Number.isFinite(best)) efforts.push({ name, distance: meters, movingTime: Math.round(best) });
  }
  return efforts;
}

export function analyzeFit(bytes: Uint8Array): RunDetails {
  const decoder = new Decoder(Stream.fromByteArray(bytes));
  if (!decoder.isFIT()) return { splits: [], bestEfforts: [] };
  const { messages } = decoder.read();
  const session = messages.sessionMesgs?.[0] as SessionMesg | undefined;

  const cadence = session?.avgRunningCadence ?? session?.avgCadence;
  const averageCadence =
    typeof cadence === 'number' ? Math.round((cadence + (session?.avgFractionalCadence ?? 0)) * 2) : undefined;
  const movingTime = typeof session?.totalTimerTime === 'number' ? Math.round(session.totalTimerTime) : undefined;

  const points = toPoints(messages.recordMesgs ?? [], messages.eventMesgs ?? []);
  if (points.length < 2 || points[points.length - 1].d < 100) {
    return { splits: [], bestEfforts: [], averageCadence, movingTime };
  }
  return { splits: computeSplits(points), bestEfforts: computeBestEfforts(points), averageCadence, movingTime };
}

async function runDetails(key: string, body: Raw): Promise<RunDetails> {
  const id = num(body.activityId);
  if (id === undefined || !Number.isInteger(id)) throw new GarminError('Invalid activity id', 400);
  // Garmin answers 406 to application/octet-stream
  const res = await garminGet(key, `${DOWNLOAD_PATH}/${id}`, 'application/x-zip-compressed');
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0) throw new GarminError('Garmin returned an empty file', 502);

  // Usually a zip holding the original .fit; tolerate a bare FIT too
  let fit: Uint8Array | undefined;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const files = unzipSync(bytes);
    const name = Object.keys(files).find((n) => n.toLowerCase().endsWith('.fit'));
    fit = name ? files[name] : undefined;
  } else {
    fit = bytes;
  }
  // GPX/TCX uploads have no FIT — the summary is all there is
  return fit ? analyzeFit(fit) : { splits: [], bestEfforts: [] };
}

// ── Handler ──

export async function POST(req: Request): Promise<Response> {
  let body: Raw;
  try {
    body = (await req.json()) as Raw;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const key = typeof body.key === 'string' ? body.key.trim() : '';
  if (!key || key.length > 500) return json({ error: 'Missing Garmin API key' }, 400);

  try {
    switch (body.action) {
      case 'list':
        return json({ activities: await listRuns(key, body) });
      case 'details':
        return json(await runDetails(key, body));
      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    if (err instanceof GarminError) return json({ error: err.message }, err.status);
    console.error('Garmin proxy failed:', err);
    return json({ error: `Garmin sync failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
  }
}
