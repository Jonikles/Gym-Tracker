/**
 * Cloud backup — Vercel function at /api/backup
 *
 * Keeps gzipped copies of the app's JSON export in a private Vercel Blob store,
 * so the data survives the home-screen app being removed (iOS deletes its
 * storage with it). One snapshot per day (the day's latest upload wins), the
 * newest 30 are kept.
 *
 * Setup (Vercel dashboard): Storage → create a Blob store with private access and
 * connect it to this project (adds BLOB_READ_WRITE_TOKEN); Settings →
 * Environment Variables → add BACKUP_SECRET; redeploy. Then enter the same
 * BACKUP_SECRET in the app (Settings → Backup).
 *
 * Every request needs `Authorization: Bearer <BACKUP_SECRET>`.
 *   GET              → { snapshots: SnapshotMeta[] } (newest first)
 *   GET ?id=<id>     → that snapshot's gzipped JSON
 *   PUT [?force=1]   → body: gzipped JSON; header X-Backup-Summary: JSON counts.
 *                      Refuses (409) an empty upload over a non-empty backup
 *                      unless forced, so a wiped device can't clobber the cloud.
 */
import { del, get, put } from '@vercel/blob';
import { createHash, timingSafeEqual } from 'node:crypto';

const INDEX_PATH = 'backups/index.json';
const snapshotPath = (id: string) => `backups/${id}.json.gz`;
const MAX_SNAPSHOTS = 30;
const MAX_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB

interface BackupSummary {
  sessions: number;
  runs: number;
  sets: number;
  templates: number;
  routines: number;
}

interface SnapshotMeta {
  id: string; // YYYY-MM-DD (UTC)
  uploadedAt: number;
  bytes: number;
  summary: BackupSummary;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

const sha = (s: string) => createHash('sha256').update(s).digest();

/** Returns an error response, or null when the request may proceed */
function checkAuth(req: Request): Response | null {
  const secret = process.env.BACKUP_SECRET;
  if (!secret) return json({ error: 'Cloud backup is not configured on the server (BACKUP_SECRET)' }, 500);
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !timingSafeEqual(sha(token), sha(secret))) return json({ error: 'Wrong backup key' }, 401);
  return null;
}

async function readIndex(): Promise<SnapshotMeta[]> {
  const res = await get(INDEX_PATH, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200) return [];
  return (await new Response(res.stream).json()) as SnapshotMeta[];
}

function parseSummary(raw: string | null): BackupSummary | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Record<string, unknown>;
    const keys = ['sessions', 'runs', 'sets', 'templates', 'routines'] as const;
    if (!keys.every((k) => typeof s[k] === 'number' && Number.isFinite(s[k]))) return null;
    return Object.fromEntries(keys.map((k) => [k, s[k]])) as unknown as BackupSummary;
  } catch {
    return null;
  }
}

const isEmpty = (s: BackupSummary) => s.sessions === 0 && s.runs === 0;
const isSnapshotId = (id: string) => /^\d{4}-\d{2}-\d{2}$/.test(id);

async function handleGet(req: Request): Promise<Response> {
  const denied = checkAuth(req);
  if (denied) return denied;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ snapshots: await readIndex() });
  if (!isSnapshotId(id)) return json({ error: 'Invalid snapshot id' }, 400);

  const res = await get(snapshotPath(id), { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200) return json({ error: 'Snapshot not found' }, 404);
  return new Response(res.stream, {
    headers: { 'Content-Type': 'application/gzip', 'Cache-Control': 'no-store' },
  });
}

async function handlePut(req: Request): Promise<Response> {
  const denied = checkAuth(req);
  if (denied) return denied;

  const summary = parseSummary(req.headers.get('x-backup-summary'));
  if (!summary) return json({ error: 'Missing or invalid backup summary' }, 400);

  const body = await req.arrayBuffer();
  if (body.byteLength === 0) return json({ error: 'Empty body' }, 400);
  if (body.byteLength > MAX_BYTES) return json({ error: 'Backup too large' }, 413);

  const index = await readIndex();
  const latest = index[0];
  const force = new URL(req.url).searchParams.get('force') === '1';
  if (latest && isEmpty(summary) && !isEmpty(latest.summary) && !force) {
    return json({ error: 'This device has no workouts or runs, but the cloud backup does', latest }, 409);
  }

  const id = new Date().toISOString().slice(0, 10);
  const meta: SnapshotMeta = { id, uploadedAt: Date.now(), bytes: body.byteLength, summary };
  await put(snapshotPath(id), Buffer.from(body), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/gzip',
  });

  const next = [meta, ...index.filter((s) => s.id !== id)].sort((a, b) => b.id.localeCompare(a.id));
  const expired = next.slice(MAX_SNAPSHOTS);
  if (expired.length > 0) await del(expired.map((s) => snapshotPath(s.id)));
  await put(INDEX_PATH, JSON.stringify(next.slice(0, MAX_SNAPSHOTS)), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
  });

  return json({ ok: true, snapshot: meta });
}

/** Report storage/setup failures as a readable message instead of a bare 500 */
function withErrors(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (err) {
      console.error('Backup failed:', err);
      const detail = err instanceof Error ? err.message : String(err);
      // Private reads go to <store>.private.blob…; a public store answers 400 there
      if (/Failed to fetch blob: 400|access/i.test(detail)) {
        return json({ error: 'The Vercel Blob store must be Private (it looks Public). Create a Private store and connect it instead.' }, 500);
      }
      return json({ error: `Server storage error: ${detail}` }, 500);
    }
  };
}

export const GET = withErrors(handleGet);
export const PUT = withErrors(handlePut);
