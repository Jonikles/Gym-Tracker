import { useState } from 'react';
import { Input, Button, Modal, ConfirmDialog } from '../common';
import { useSettings } from '../../hooks/useSettings';
import { db } from '../../db';
import {
  backupNow,
  connectBackup,
  disconnectBackup,
  listSnapshots,
  restoreSnapshot,
  useBackupStatus,
  type SnapshotMeta,
} from '../../utils/cloudBackup';
import styles from './Settings.module.css';

function formatAgo(ts: number): string {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatSnapshotDate(s: SnapshotMeta): string {
  return new Date(s.uploadedAt).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function describeSummary(s: SnapshotMeta['summary']): string {
  const parts = [`${s.sessions} workout${s.sessions === 1 ? '' : 's'}`];
  if (s.runs > 0) parts.push(`${s.runs} run${s.runs === 1 ? '' : 's'}`);
  if (s.templates > 0) parts.push(`${s.templates} template${s.templates === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

async function deviceHasData(): Promise<boolean> {
  const [sessions, runs] = await Promise.all([db.sessions.count(), db.runs.count()]);
  return sessions > 0 || runs > 0;
}

/**
 * Cloud backup rows for the Settings "Backup" card: set up / back up now, and
 * restore from a daily snapshot.
 */
export function CloudBackupRows() {
  const settings = useSettings();
  const status = useBackupStatus();
  const connected = !!settings.backupKey;

  const [setupOpen, setSetupOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[] | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [pending, setPending] = useState<SnapshotMeta | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const openRestore = async (preloaded?: SnapshotMeta[]) => {
    setRestoreOpen(true);
    setRestoreError(null);
    setSnapshots(preloaded ?? null);
    if (preloaded) return;
    try {
      setSnapshots(await listSnapshots());
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Could not load backups');
    }
  };

  const handleConnect = async () => {
    setNotice(null);
    setSetupBusy(true);
    setSetupError(null);
    try {
      const found = await connectBackup(keyInput);
      setSetupOpen(false);
      setKeyInput('');
      // Fresh install with a backup waiting — restore before anything gets uploaded
      if (found.length > 0 && !(await deviceHasData())) {
        openRestore(found);
      } else {
        backupNow({ force: true }).catch(() => undefined);
      }
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Could not connect');
    } finally {
      setSetupBusy(false);
    }
  };

  const handleBackupNow = () => {
    setNotice(null);
    backupNow({ force: true })
      .then(() => setNotice('Backed up'))
      .catch(() => undefined); // shown via status
  };

  const handleRestore = async () => {
    if (!pending) return;
    await restoreSnapshot(pending.id);
    setRestoreOpen(false);
    setNotice(`Restored the backup from ${formatSnapshotDate(pending)}`);
  };

  let desc: string;
  if (!connected) desc = 'Back up automatically, so removing the app never loses data';
  else if (status.busy) desc = 'Backing up…';
  else if (settings.lastCloudBackupAt) desc = `On · last backup ${formatAgo(settings.lastCloudBackupAt)}`;
  else desc = 'On · waiting for the first backup';

  return (
    <>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <span className={styles.settingLabel}>Cloud backup</span>
          <span className={styles.settingDesc}>{desc}</span>
          {connected && status.error && (
            <span className={`${styles.settingDesc} ${styles.dangerTitle}`}>{status.error}</span>
          )}
        </div>
        {connected ? (
          <Button variant="secondary" size="sm" onClick={handleBackupNow} disabled={status.busy} className={styles.rowButton}>
            Back up
          </Button>
        ) : (
          <Button size="sm" onClick={() => setSetupOpen(true)} className={styles.rowButton}>
            Set up
          </Button>
        )}
      </div>

      {connected && (
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Restore from cloud</span>
            <span className={styles.settingDesc}>Pick one of the last 30 daily backups</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => openRestore()} className={styles.rowButton}>
            Restore
          </Button>
        </div>
      )}

      {connected && status.needsRestore && (
        <div role="status" className={`${styles.message} ${styles.error}`}>
          This device has no workouts, but your cloud backup does — so it wasn’t overwritten. Tap Restore to
          get your data back.
        </div>
      )}

      {notice && !status.error && (
        <div role="status" className={`${styles.message} ${styles.success}`}>
          {notice}
        </div>
      )}

      <Modal
        isOpen={setupOpen}
        onClose={() => {
          setSetupOpen(false);
          setShowKey(false);
        }}
        title="Cloud backup"
      >
        <div className={styles.modalStack}>
          <p className={styles.modalText}>
            Enter the backup key — the <code>BACKUP_SECRET</code> value set in the Vercel project. After that, the
            app backs itself up whenever your data changes.
          </p>
          <div className={styles.keyField}>
            <Input
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Backup key"
              placeholder="Backup key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              error={setupError ?? undefined}
              className={styles.keyInput}
            />
            <button
              type="button"
              className={styles.revealButton}
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Hide backup key' : 'Show backup key'}
              aria-pressed={showKey}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                <circle cx="12" cy="12" r="3" />
                {showKey && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </div>
          <Button onClick={handleConnect} disabled={setupBusy || !keyInput.trim()}>
            {setupBusy ? 'Checking…' : 'Connect'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={restoreOpen} onClose={() => setRestoreOpen(false)} title="Restore from cloud">
        <div className={styles.modalStack}>
          {restoreError && <div className={`${styles.message} ${styles.error}`}>{restoreError}</div>}
          {!snapshots && !restoreError && <p className={styles.modalText}>Loading backups…</p>}
          {snapshots?.length === 0 && <p className={styles.modalText}>No backups yet.</p>}
          {snapshots && snapshots.length > 0 && (
            <ul className={styles.snapshotList}>
              {snapshots.map((s) => (
                <li key={s.id}>
                  <button type="button" className={styles.snapshotItem} onClick={() => setPending(s)}>
                    <span className={styles.settingLabel}>{formatSnapshotDate(s)}</span>
                    <span className={styles.settingDesc}>{describeSummary(s.summary)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" size="sm" onClick={() => setConfirmOff(true)}>
            Turn off cloud backup on this device
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={handleRestore}
        title="Restore backup"
        message={
          pending
            ? `Replace everything on this device with the backup from ${formatSnapshotDate(pending)} (${describeSummary(pending.summary)})?`
            : ''
        }
        confirmLabel="Restore"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={confirmOff}
        onClose={() => setConfirmOff(false)}
        onConfirm={async () => {
          await disconnectBackup();
          setNotice(null);
          setRestoreOpen(false);
        }}
        title="Turn off cloud backup"
        message="Stop backing up this device? Backups already in the cloud are kept."
        confirmLabel="Turn off"
        variant="danger"
      />
    </>
  );
}
