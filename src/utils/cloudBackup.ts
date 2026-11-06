import { useSyncExternalStore } from 'react';
import { db } from '../db';
import { collectExportData, importData } from '../hooks/useSettings';
import type { SettingsMap } from '../types';

/**
 * Automatic cloud backup. Gzipped snapshots of the full export go to the app's
 * Vercel function (api/backup.ts), which keeps one per day.
 * Removing the home-screen app wipes its local storage on iOS — this is what
 * makes that recoverable.
 */

const FUNCTION_URL = '/api/backup';
/** While the app is open, check for changes this often */
const AUTO_INTERVAL_MS = 2 * 60 * 1000;

export interface BackupSummary {
  sessions: number;
  runs: number;
  sets: number;
  templates: number;
  routines: number;
}

export interface SnapshotMeta {
  id: string; // YYYY-MM-DD
  uploadedAt: number;
  bytes: number;
  summary: BackupSummary;
}

export class BackupError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'BackupError';
    this.status = status;
  }
}

// ── Status (for the Settings screen) ──

export interface BackupStatus {
  busy: boolean;
  /** Last auto/manual backup error, cleared by the next success */
  error: string | null;
  /** Cloud has data but this device is empty — offer a restore instead of uploading */
  needsRestore: boolean;
}

let status: BackupStatus = { busy: false, error: null, needsRestore: false };
const listeners = new Set<() => void>();

function setStatus(patch: Partial<BackupStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function useBackupStatus(): BackupStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status
  );
}

// ── Settings helpers (backup keys are device-only, see BACKUP_SETTING_KEYS) ──

async function getSetting<K extends keyof SettingsMap>(key: K): Promise<SettingsMap[K] | null> {
  const s = await db.settings.get(key);
  return (s?.value as SettingsMap[K] | undefined) ?? null;
}

async function setSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K]): Promise<void> {
  if (value === null) await db.settings.delete(key);
  else await db.settings.put({ key, value, updatedAt: Date.now() });
}

// ── Encoding ──

async function gzip(text: string): Promise<Blob> {
  if (typeof CompressionStream === 'undefined') throw new BackupError('This browser can’t compress backups');
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

async function gunzip(data: Blob): Promise<string> {
  if (typeof DecompressionStream === 'undefined') throw new BackupError('This browser can’t read backups');
  const stream = data.stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Function calls ──

async function call(key: string, init: RequestInit & { query?: Record<string, string> } = {}): Promise<Response> {
  const url = new URL(FUNCTION_URL, window.location.origin);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${key}` } });
  } catch {
    throw new BackupError("Couldn't reach the server. Check your connection.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = (data && typeof data.error === 'string' && data.error) || `Request failed (${res.status})`;
    throw new BackupError(message, res.status);
  }
  return res;
}

async function requireKey(): Promise<string> {
  const key = await getSetting('backupKey');
  if (!key) throw new BackupError('Cloud backup is not set up');
  return key;
}

export async function listSnapshots(key?: string): Promise<SnapshotMeta[]> {
  const res = await call(key ?? (await requireKey()));
  // Without the function deployed, the SPA fallback answers with index.html
  const data = (await res.json().catch(() => null)) as { snapshots?: SnapshotMeta[] } | null;
  if (!Array.isArray(data?.snapshots)) throw new BackupError('The backup server isn’t set up on this site');
  return data.snapshots;
}

// ── Setup ──

/**
 * Check a key against the server and save it. Returns the cloud's snapshots so
 * the caller can offer a restore (e.g. on a fresh install).
 */
export async function connectBackup(rawKey: string): Promise<SnapshotMeta[]> {
  const key = rawKey.trim();
  if (!key) throw new BackupError('Enter your backup key');
  const snapshots = await listSnapshots(key);
  await setSetting('backupKey', key);
  await setSetting('lastCloudBackupHash', null);
  setStatus({ error: null, needsRestore: false });
  return snapshots;
}

export async function disconnectBackup(): Promise<void> {
  await Promise.all([
    setSetting('backupKey', null),
    setSetting('lastCloudBackupAt', null),
    setSetting('lastCloudBackupHash', null),
  ]);
  setStatus({ error: null, needsRestore: false });
}

// ── Backing up ──

let inFlight: Promise<boolean> | null = null;

/**
 * Upload a snapshot if the data changed since the last upload (or always, when
 * `force`). Returns whether anything was uploaded. `overwrite` lets an empty
 * device replace a non-empty cloud backup.
 */
export function backupNow(opts: { force?: boolean; overwrite?: boolean } = {}): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const key = await getSetting('backupKey');
    if (!key) return false;

    setStatus({ busy: true });
    try {
      const data = await collectExportData();
      const text = JSON.stringify(data);
      const hash = await sha256(text);
      if (!opts.force && hash === (await getSetting('lastCloudBackupHash'))) {
        setStatus({ error: null });
        return false;
      }

      const summary: BackupSummary = {
        sessions: data.sessions.length,
        runs: data.runs.length,
        sets: data.sets.length,
        templates: data.templates.length,
        routines: data.routines.length,
      };
      await call(key, {
        method: 'PUT',
        query: opts.overwrite ? { force: '1' } : undefined,
        headers: { 'Content-Type': 'application/gzip', 'X-Backup-Summary': JSON.stringify(summary) },
        body: await gzip(text),
      });

      await Promise.all([setSetting('lastCloudBackupHash', hash), setSetting('lastCloudBackupAt', Date.now())]);
      setStatus({ error: null, needsRestore: false });
      return true;
    } catch (err) {
      const conflict = err instanceof BackupError && err.status === 409;
      setStatus({
        error: conflict ? null : err instanceof Error ? err.message : 'Backup failed',
        needsRestore: conflict,
      });
      throw err;
    } finally {
      setStatus({ busy: false });
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

// ── Restoring ──

/** Replace all local data with a cloud snapshot */
export async function restoreSnapshot(id: string): Promise<void> {
  const key = await requireKey();
  const res = await call(key, { query: { id } });
  const text = await gunzip(await res.blob());
  const result = await importData(text);
  if (!result.success) throw new BackupError(result.message);
  // The restored data is what the cloud already holds — no need to re-upload it
  await setSetting('lastCloudBackupHash', await sha256(JSON.stringify(await collectExportData())));
  setStatus({ error: null, needsRestore: false });
}

// ── Auto backup ──

/**
 * Back up on start, every few minutes while open, and when the app goes to the
 * background (the usual moment after finishing a workout). Returns a cleanup.
 */
export function startAutoBackup(): () => void {
  const run = () => {
    backupNow().catch(() => undefined); // surfaced via useBackupStatus
  };
  const onVisibility = () => run();

  run();
  const timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') run();
  }, AUTO_INTERVAL_MS);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** Ask the browser not to evict this app's storage under pressure */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => undefined);
}
