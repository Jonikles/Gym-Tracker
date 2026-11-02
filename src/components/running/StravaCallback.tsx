import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common';
import { completeStravaCallback, StravaError } from '../../utils/strava';
import styles from './Running.module.css';

type Status = 'working' | 'handoff' | 'error';

/** Strava redirects here after the user approves (or denies) access */
export function StravaCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('working');
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // the code can only be exchanged once
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    completeStravaCallback(params)
      .then((result) => {
        if (result === 'connected') navigate('/running', { replace: true });
        else setStatus('handoff');
      })
      .catch((err) => {
        setError(err instanceof StravaError ? err.message : 'Could not connect to Strava.');
        setStatus('error');
      });
  }, [navigate]);

  return (
    <div className={`${styles.container} ${styles.callback}`}>
      {status === 'working' && <p className={styles.empty}>Connecting to Strava…</p>}
      {status === 'handoff' && (
        <>
          <h1 className="page-title">Strava connected</h1>
          <p className={styles.stravaDesc}>
            Go back to the Gym Tracker app. It finishes connecting when you open it.
          </p>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="page-title">Couldn't connect</h1>
          <p className={styles.syncError} role="alert">{error}</p>
          <Button onClick={() => navigate('/running', { replace: true })}>Back to Running</Button>
        </>
      )}
    </div>
  );
}
