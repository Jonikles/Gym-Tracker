import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ConfirmDialog } from '../common';
import { formatLongDate, formatTime } from '../common/format';
import { deleteRun, updateRunNotes, useRun } from '../../hooks/useRuns';
import { RUN_KIND_LABELS, formatDistance, formatPace, formatRunTime, paceSecondsPerKm, runPace } from '../../utils/run';
import type { Run } from '../../types';
import { PoweredByStrava } from './StravaSync';
import styles from './Running.module.css';

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>
        <span className="num">{value}</span>
        {unit && <span className={styles.statUnit}> {unit}</span>}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function Splits({ run }: { run: Run }) {
  const splits = run.splits ?? [];
  if (splits.length === 0) return null;
  const paces = splits.map((s) => paceSecondsPerKm(s.distance, s.movingTime) ?? 0);
  // The short leftover split at the end doesn't compete for "fastest"
  const isPartial = (i: number) => splits[i].distance < 950;
  const fullPaces = paces.filter((p, i) => p > 0 && !isPartial(i));
  const fastest = fullPaces.length > 0 ? Math.min(...fullPaces) : 0;
  const slowest = Math.max(...paces);
  const hasHr = splits.some((s) => s.averageHeartrate != null);
  return (
    <section className={styles.section} aria-label="Splits">
      <h2 className="section-title">Splits</h2>
      <div className={`surface ${styles.splits}`}>
        <div className={`${styles.splitRow} ${styles.splitHead}`}>
          <span>km</span>
          <span>Pace</span>
          <span />
          {hasHr && <span>HR</span>}
        </div>
        {splits.map((s, i) => {
          const pace = paces[i];
          // Bar width relative to the slowest split, so faster = shorter bar
          const width = slowest > 0 && pace > 0 ? Math.max(12, (pace / slowest) * 100) : 0;
          const partial = isPartial(i);
          return (
            <div key={i} className={styles.splitRow}>
              <span className="num">{partial ? (s.distance / 1000).toFixed(2) : i + 1}</span>
              <span className="num">{formatPace(pace).replace(' /km', '')}</span>
              <span className={styles.splitBarTrack}>
                <span
                  className={`${styles.splitBar} ${!partial && pace === fastest ? styles.splitBarBest : ''}`}
                  style={{ width: `${width}%` }}
                />
              </span>
              {hasHr && <span className="num">{s.averageHeartrate != null ? Math.round(s.averageHeartrate) : '–'}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const EFFORTS_SHOWN = ['400m', '1k', '1 mile', '5k', '10k', 'Half-Marathon', 'Marathon'];

function BestEfforts({ run }: { run: Run }) {
  const efforts = (run.bestEfforts ?? []).filter((e) => EFFORTS_SHOWN.includes(e.name));
  if (efforts.length === 0) return null;
  return (
    <section className={styles.section} aria-label="Best efforts">
      <h2 className="section-title">Best efforts in this run</h2>
      <div className={`surface ${styles.effortList}`}>
        {efforts.map((e) => (
          <div key={e.name} className={styles.effortRow}>
            <span className={styles.effortName}>{e.name}</span>
            <span className="num">{formatRunTime(e.movingTime)}</span>
            <span className={`num ${styles.effortPace}`}>{formatPace(paceSecondsPerKm(e.distance, e.movingTime))}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotesEditor({ run }: { run: Run }) {
  const [notes, setNotes] = useState(run.notes ?? '');
  return (
    <section className={styles.section} aria-label="Notes">
      <h2 className="section-title">Notes</h2>
      <textarea
        className={styles.notes}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => {
          if (notes.trim() !== (run.notes ?? '')) void updateRunNotes(run.id, notes);
        }}
        placeholder="How did it feel?"
        rows={3}
      />
    </section>
  );
}

export function RunDetail({ runId }: { runId: string }) {
  const navigate = useNavigate();
  const run = useRun(runId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (run === undefined) return null;
  if (run === null) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>This run no longer exists.</p>
        <Button variant="secondary" onClick={() => navigate('/running')}>Back to runs</Button>
      </div>
    );
  }

  const stats: { label: string; value: string; unit?: string }[] = [
    { label: 'Distance', value: formatDistance(run.distance).replace(' km', ''), unit: 'km' },
    { label: 'Moving time', value: formatRunTime(run.movingTime) },
    { label: 'Avg pace', value: formatPace(runPace(run)).replace(' /km', ''), unit: '/km' },
  ];
  if (run.averageHeartrate != null) stats.push({ label: 'Avg HR', value: String(Math.round(run.averageHeartrate)), unit: 'bpm' });
  if (run.maxHeartrate != null) stats.push({ label: 'Max HR', value: String(Math.round(run.maxHeartrate)), unit: 'bpm' });
  if (run.averageCadence != null) stats.push({ label: 'Cadence', value: String(run.averageCadence), unit: 'spm' });
  if (run.elevationGain != null && run.kind !== 'treadmill') stats.push({ label: 'Elevation', value: String(Math.round(run.elevationGain)), unit: 'm' });
  if (run.elapsedTime != null && run.elapsedTime - run.movingTime >= 60) stats.push({ label: 'Elapsed', value: formatRunTime(run.elapsedTime) });

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backLink} onClick={() => navigate(-1)}>‹ Back</button>

      <header className={styles.detailHeader}>
        <span className="eyebrow">
          {RUN_KIND_LABELS[run.kind]} · {formatLongDate(run.startedAt)} · {formatTime(run.startedAt)}
        </span>
        <h1 className="page-title">{run.name}</h1>
      </header>

      <div className={`surface ${styles.statGrid}`}>
        {stats.map((s) => <Stat key={s.label} {...s} />)}
      </div>

      {run.source === 'strava' && !run.detailsFetched && (
        <p className={styles.formHint}>Splits load on the next sync.</p>
      )}

      <Splits run={run} />
      <BestEfforts run={run} />
      <NotesEditor key={run.id} run={run} />

      <div className={styles.detailFooter}>
        {run.source === 'strava' && run.stravaId != null && (
          <div className={styles.stravaLinkRow}>
            <a
              className={styles.stravaLink}
              href={`https://www.strava.com/activities/${run.stravaId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Strava
            </a>
            <PoweredByStrava />
          </div>
        )}
        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>Delete run</Button>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteRun(run.id);
          navigate('/running', { replace: true });
        }}
        title="Delete Run"
        message={
          run.source === 'strava'
            ? 'Remove this run from the app? It stays on Strava.'
            : 'Delete this run? This cannot be undone.'
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
