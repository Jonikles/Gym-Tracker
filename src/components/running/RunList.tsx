import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, SkeletonList } from '../common';
import { useRuns } from '../../hooks/useRuns';
import { formatDistance } from '../../utils/run';
import { computeRunRecords } from '../../utils/runStats';
import { RunningStats } from './RunningStats';
import { RunPlanSection } from './RunPlan';
import type { Run } from '../../types';
import { AddRunModal } from './AddRunModal';
import { RunCard } from './RunCard';
import { StravaSync } from './StravaSync';
import styles from './Running.module.css';

/** Runs grouped by calendar month, newest first */
function groupByMonth(runs: Run[]) {
  const groups = new Map<string, { label: string; runs: Run[]; distance: number }>();
  const thisYear = new Date().getFullYear();
  for (const run of runs) {
    const d = new Date(run.startedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        label: d.toLocaleDateString(undefined, {
          month: 'long',
          ...(d.getFullYear() === thisYear ? {} : { year: 'numeric' }),
        }),
        runs: [],
        distance: 0,
      };
      groups.set(key, g);
    }
    g.runs.push(run);
    g.distance += run.distance;
  }
  return [...groups.entries()];
}

export function RunList() {
  const navigate = useNavigate();
  const runs = useRuns();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const groups = useMemo(() => groupByMonth(runs ?? []), [runs]);
  const records = useMemo(() => computeRunRecords(runs ?? []), [runs]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="page-title">Running</h1>
        <div className={styles.headerActions}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/running/timer')}>Timer</Button>
          <Button variant="secondary" size="sm" onClick={() => setIsAddOpen(true)}>+ Add run</Button>
        </div>
      </header>

      <StravaSync />
      <RunPlanSection />

      {runs === undefined ? (
        <SkeletonList count={4} lines={2} />
      ) : runs.length === 0 ? (
        <p className={styles.empty}>No runs yet. Sync from Strava or add one by hand.</p>
      ) : (
        <div className={styles.list}>
          <RunningStats runs={runs} />
          {groups.map(([key, g]) => (
            <section key={key} className={styles.monthGroup} aria-label={g.label}>
              <div className={styles.monthHeader}>
                <h2 className="eyebrow">{g.label}</h2>
                <span className={`num ${styles.monthTotal}`}>
                  {g.runs.length} run{g.runs.length === 1 ? '' : 's'} · {formatDistance(g.distance)}
                </span>
              </div>
              {g.runs.map((run) => (
                <RunCard
                  key={run.id}
                  run={run}
                  showDate
                  records={records.get(run.id)}
                  onClick={() => navigate(`/running/${run.id}`)}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      <AddRunModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdded={(id) => navigate(`/running/${id}`)}
      />
    </div>
  );
}
