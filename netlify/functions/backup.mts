/**
 * Cloud backup — runs on Netlify at /.netlify/functions/backup
 *
 * Keeps gzipped copies of the app's JSON export in Netlify Blobs, so the data
 * survives the home-screen app being removed (iOS deletes its storage with it).
 * One snapshot per day (the day's latest upload wins), the newest 30 are kept.
 *
 * Every request needs `Authorization: Bearer <BACKUP_SECRET>`. Configure it in
 * Netlify → Site configuration → Environment variables, then enter the same
 * value in the app (Settings → Backup).
 *
 *   GET              → { snapshots: SnapshotMeta[] } (newest first)
 *   GET ?id=<id>     → that snapshot's gzipped JSON
 *   PUT [?force=1]   → body: gzipped JSON; header X-Backup-Summary: JSON counts.
 *                      Refuses (409) an empty upload over a non-empty backup
 *                      unless forced, so a wiped device can't clobber the cloud.
 */
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';

const INDEX_KEY = 'index';
const MAX_SNAPSHOTS = 30;
const MAX_BYTES = 5 * 1024 * 1024;

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

function authorized(req: Request, secret: string): boolean {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token.length > 0 && timingSafeEqual(sha(token), sha(secret));
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

export default async (req: Request): Promise<Response> => {
  const secret = process.env.BACKUP_SECRET;
  if (!secret) return json({ error: 'Cloud backup is not configured on the server (BACKUP_SECRET)' }, 500);
  if (!authorized(req, secret)) return json({ error: 'Wrong backup key' }, 401);

  const store = getStore({ name: 'backups', consistency: 'strong' });
  const url = new URL(req.url);
  const index = ((await store.get(INDEX_KEY, { type: 'json' })) as SnapshotMeta[] | null) ?? [];

  if (req.method === 'GET') {
    const id = url.searchParams.get('id');
    if (!id) return json({ snapshots: index });
    if (!isSnapshotId(id)) return json({ error: 'Invalid snapshot id' }, 400);
    const data = await store.get(`snap/${id}`, { type: 'arrayBuffer' });
    if (!data) return json({ error: 'Snapshot not found' }, 404);
    return new Response(data, {
      headers: { 'Content-Type': 'application/gzip', 'Cache-Control': 'no-store' },
    });
  }

  if (req.method === 'PUT') {
    const summary = parseSummary(req.headers.get('x-backup-summary'));
    if (!summary) return json({ error: 'Missing or invalid backup summary' }, 400);

    const body = await req.arrayBuffer();
    if (body.byteLength === 0) return json({ error: 'Empty body' }, 400);
    if (body.byteLength > MAX_BYTES) return json({ error: 'Backup too large' }, 413);

    const latest = index[0];
    if (latest && isEmpty(summary) && !isEmpty(latest.summary) && url.searchParams.get('force') !== '1') {
      return json({ error: 'This device has no workouts or runs, but the cloud backup does', latest }, 409);
    }

    const id = new Date().toISOString().slice(0, 10);
    const meta: SnapshotMeta = { id, uploadedAt: Date.now(), bytes: body.byteLength, summary };
    await store.set(`snap/${id}`, body);

    const next = [meta, ...index.filter((s) => s.id !== id)].sort((a, b) => b.id.localeCompare(a.id));
    for (const old of next.slice(MAX_SNAPSHOTS)) await store.delete(`snap/${old.id}`);
    await store.setJSON(INDEX_KEY, next.slice(0, MAX_SNAPSHOTS));

    return json({ ok: true, snapshot: meta });
  }

  return json({ error: 'Method not allowed' }, 405);
};
