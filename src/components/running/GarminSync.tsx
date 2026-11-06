import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../common';
import { useSetting } from '../../hooks/useSettings';
import { syncGarminRuns, GarminError, type SyncResult } from '../../utils/garmin';
import { GarminConnectModal } from './GarminConnectModal';
import styles from './Running.module.css';

/** Auto-sync at most once per app launch, when the Running page first opens */
let autoSyncedThisLaunch = false;

function describeResult(r: SyncResult): string {
  const parts: string[] = [];
  if (r.added > 0) parts.push(`${r.added} new run${r.added === 1 ? '' : 's'}`);
  if (r.added === 0) parts.push('Up to date');
  if (r.newRecords.length > 0) parts.push(`🏆 new best ${r.newRecords.join(', ')}`);
  if (r.detailsPending > 0) parts.push(`splits for ${r.detailsPending} more on next sync`);
  return parts.join(' · ');
}

/** Garmin status + Sync button for the top of the Running page */
export function GarminSync() {
  const apiKey = useSetting('garminApiKey');
  const [busy, setBusy] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string; keyProblem?: boolean } | null>(null);
  const busyRef = useRef(false);

  const sync = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      setMessage({ kind: 'ok', text: describeResult(await syncGarminRuns()) });
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof GarminError ? err.message : 'Sync failed. Try again.',
        keyProblem: err instanceof GarminError && err.status === 401,
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const connected = !!apiKey;
  useEffect(() => {
    if (connected && !autoSyncedThisLaunch) {
      autoSyncedThisLaunch = true;
      void sync();
    }
  }, [connected, sync]);

  const modal = (
    <GarminConnectModal
      isOpen={connectOpen}
      onClose={() => setConnectOpen(false)}
      onConnected={() => void sync()}
    />
  );

  if (!connected) {
    return (
      <div className={`surface ${styles.syncCard}`}>
        <div className={styles.syncInfo}>
          <span className={styles.syncTitle}>Sync runs from Garmin</span>
          <span className={styles.syncDesc}>
            Runs from your watch come in automatically, with splits and best efforts.
          </span>
        </div>
        <Button onClick={() => setConnectOpen(true)} className={styles.syncConnectBtn}>
          Connect Garmin
        </Button>
        {modal}
      </div>
    );
  }

  return (
    <div className={`surface ${styles.syncCard} ${styles.syncCardConnected}`}>
      <div className={styles.syncRow}>
        <div className={styles.syncInfo}>
          <span className={styles.syncTitle}>Garmin</span>
          <span
            className={message?.kind === 'error' ? styles.syncError : styles.syncDesc}
            role={message?.kind === 'error' ? 'alert' : 'status'}
          >
            {busy ? 'Syncing…' : message?.text ?? 'Connected'}
          </span>
        </div>
        {message?.keyProblem ? (
          <Button size="sm" onClick={() => setConnectOpen(true)}>
            New key
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={sync} disabled={busy} aria-busy={busy}>
            {busy ? 'Syncing…' : 'Sync'}
          </Button>
        )}
      </div>
      {modal}
    </div>
  );
}
