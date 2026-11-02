import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../common';
import { useSetting } from '../../hooks/useSettings';
import { startStravaConnect, syncStravaRuns, StravaError, type SyncResult } from '../../utils/strava';
import styles from './Running.module.css';

/** Auto-sync at most once per app launch, when the Running page first opens */
let autoSyncedThisLaunch = false;

function describeResult(r: SyncResult): string {
  const parts: string[] = [];
  if (r.added > 0) parts.push(`${r.added} new run${r.added === 1 ? '' : 's'}`);
  if (r.added === 0) parts.push('Up to date');
  if (r.detailsPending > 0) parts.push(`splits for ${r.detailsPending} more on next sync`);
  return parts.join(' · ');
}

/** "Powered by Strava" attribution, required next to Strava data */
export function PoweredByStrava() {
  return <span className={styles.poweredBy}>Powered by Strava</span>;
}

/** Strava status + Sync button for the top of the Running page */
export function StravaSync() {
  const auth = useSetting('stravaAuth');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const busyRef = useRef(false);

  const sync = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      setMessage({ kind: 'ok', text: describeResult(await syncStravaRuns()) });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof StravaError ? err.message : 'Sync failed. Try again.' });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const connected = !!auth;
  useEffect(() => {
    if (connected && !autoSyncedThisLaunch) {
      autoSyncedThisLaunch = true;
      void sync();
    }
  }, [connected, sync]);

  const connect = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await startStravaConnect(); // navigates away
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof StravaError ? err.message : 'Could not start Strava sign-in.' });
      setBusy(false);
    }
  };

  if (!auth) {
    return (
      <div className={`surface ${styles.stravaCard}`}>
        <div className={styles.stravaInfo}>
          <span className={styles.stravaTitle}>Sync runs from Strava</span>
          <span className={styles.stravaDesc}>
            Runs from your watch reach Strava automatically once Garmin Connect is linked to it.
          </span>
        </div>
        <Button onClick={connect} disabled={busy} className={styles.stravaConnectBtn}>
          {busy ? 'Opening…' : 'Connect Strava'}
        </Button>
        {message && <p className={styles.syncError} role="alert">{message.text}</p>}
      </div>
    );
  }

  return (
    <div className={`surface ${styles.stravaCard} ${styles.stravaCardConnected}`}>
      <div className={styles.stravaRow}>
        <div className={styles.stravaInfo}>
          <span className={styles.stravaTitle}>Strava{auth.athlete?.name ? ` · ${auth.athlete.name}` : ''}</span>
          <span
            className={message?.kind === 'error' ? styles.syncError : styles.stravaDesc}
            role={message?.kind === 'error' ? 'alert' : 'status'}
          >
            {busy ? 'Syncing…' : message?.text ?? 'Connected'}
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={sync} disabled={busy} aria-busy={busy}>
          {busy ? 'Syncing…' : 'Sync'}
        </Button>
      </div>
      <PoweredByStrava />
    </div>
  );
}
