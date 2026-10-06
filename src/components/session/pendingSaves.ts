/**
 * Registry of debounced-but-not-yet-written edits (set rows, exercise notes).
 * Components register a flush function while they have an unsaved edit and
 * unregister once it has been written. Anything that needs the DB to be
 * up to date (e.g. completing a workout) awaits `flushPendingSaves()` first.
 */
type FlushFn = () => Promise<void> | void;

const pending = new Map<string, FlushFn>();

export function registerPendingSave(key: string, flush: FlushFn): void {
  pending.set(key, flush);
}

export function unregisterPendingSave(key: string): void {
  pending.delete(key);
}

/** Write every pending edit now. Safe to call when nothing is pending. */
export async function flushPendingSaves(): Promise<void> {
  const fns = [...pending.values()];
  pending.clear();
  await Promise.all(fns.map((fn) => fn()));
}
