import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, ConfirmDialog, Input, Modal } from '../common';
import { formatDateInputValue } from '../common/format';
import { RUN_PLANS } from '../../data/runPlans';
import { clearPlanMark, endRunPlan, markPlanDay, startRunPlan, useRunPlanProgress } from '../../hooks/useRunPlan';
import { useToday } from '../../hooks/useToday';
import { planLabel, type PlanProgress, type PlanSessionInfo } from '../../utils/runPlan';
import styles from './Running.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekdayName(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'long' });
}

/**
 * Today's plan session: what to run, and quick "done" / "skip" marks.
 * A synced or hand-added run completes it automatically; the timer is only an option.
 */
export function PlanToday({ progress, compact }: { progress: PlanProgress; compact?: boolean }) {
  const today = useToday();
  const { plan, next, todayCredit, isTrainingDay, nextTrainingDay, finished, position, total } = progress;

  const header = (
    <div className={styles.planTop}>
      {compact ? (
        <Link to="/running" className={`eyebrow ${styles.planNameLink}`}>{plan.name} ›</Link>
      ) : (
        <span className="eyebrow">{plan.name}</span>
      )}
      <span className={`num ${styles.planCount}`}>{position}/{total}</span>
    </div>
  );

  if (todayCredit) {
    const manual = !todayCredit.runId;
    return (
      <div className={`surface ${styles.planCard}`}>
        {header}
        <div className={styles.planRow}>
          <span className={`chip ${todayCredit.status === 'done' ? 'chip-success' : ''}`}>
            {todayCredit.status === 'done' ? '✓ Done today' : 'Skipped today'}
          </span>
          <span className={styles.planMeta}>{planLabel(todayCredit)}</span>
          {manual && (
            <button type="button" className={styles.linkBtn} onClick={() => clearPlanMark(today)}>Undo</button>
          )}
        </div>
        {!finished && next && !compact && (
          <p className={styles.planMeta}>
            Next{nextTrainingDay ? ` ${weekdayName(nextTrainingDay)}` : ''}: {next.session.title}
          </p>
        )}
      </div>
    );
  }

  if (finished || !next) {
    return (
      <div className={`surface ${styles.planCard}`}>
        {header}
        <p className={styles.planTitle}>Plan complete 🎉</p>
        {!compact && <p className={styles.planMeta}>Pick another plan below whenever you're ready.</p>}
      </div>
    );
  }

  if (!isTrainingDay) {
    return (
      <div className={`surface ${styles.planCard}`}>
        {header}
        <p className={styles.planMeta}>
          Next run{nextTrainingDay ? ` ${weekdayName(nextTrainingDay)}` : ''} · {planLabel(next)}
        </p>
        <p className={styles.planTitle}>{next.session.title}</p>
        {!compact && <p className={styles.planSummary}>{next.session.summary}</p>}
      </div>
    );
  }

  return (
    <div className={`surface ${styles.planCard}`}>
      {header}
      <p className={styles.planMeta}>Today · {planLabel(next)}</p>
      <p className={styles.planTitle}>{next.session.title}</p>
      <p className={styles.planSummary}>{next.session.summary}</p>
      <div className={styles.planActions}>
        <Button size="sm" variant="secondary" onClick={() => markPlanDay(today, 'done')}>Mark done</Button>
        <Button size="sm" variant="ghost" onClick={() => markPlanDay(today, 'skipped')}>Skip</Button>
        {next.session.segments && (
          <Link to={`/running/timer?session=${next.index}`} className={styles.timerLink}>Timer</Link>
        )}
      </div>
      {!compact && <p className={styles.formHint}>A run synced or added today also counts.</p>}
    </div>
  );
}

function StartPlanModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start a plan">
      {isOpen && <StartPlanForm onClose={onClose} />}
    </Modal>
  );
}

function StartPlanForm({ onClose }: { onClose: () => void }) {
  const [planId, setPlanId] = useState(RUN_PLANS[0].id);
  const [days, setDays] = useState<number[]>([1, 3, 6]);
  const [start, setStart] = useState(() => formatDateInputValue(new Date()));
  const plan = RUN_PLANS.find((p) => p.id === planId)!;
  const valid = days.length >= 1 && !!start;

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const handleStart = async () => {
    const [y, m, d] = start.split('-').map(Number);
    await startRunPlan(planId, days, new Date(y, m - 1, d).getTime());
    onClose();
  };

  return (
    <div className={styles.form}>
      <div className={styles.planOptions} role="radiogroup" aria-label="Plan">
        {RUN_PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={p.id === planId}
            className={`${styles.planOption} ${p.id === planId ? styles.planOptionActive : ''}`}
            onClick={() => setPlanId(p.id)}
          >
            <span className={styles.planTitle}>{p.name}</span>
            <span className={styles.planSummary}>{p.description}</span>
          </button>
        ))}
      </div>
      <div>
        <span className={styles.fieldLabel}>
          Training days <span className={styles.fieldHint}>({plan.sessionsPerWeek} a week suggested)</span>
        </span>
        <div className={styles.dayChips} role="group" aria-label="Training days">
          {WEEKDAYS.map((label, d) => (
            <button
              key={label}
              type="button"
              aria-pressed={days.includes(d)}
              className={`${styles.dayChip} ${days.includes(d) ? styles.dayChipActive : ''}`}
              onClick={() => toggleDay(d)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <Input label="Start date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleStart} disabled={!valid}>Start plan</Button>
      </div>
    </div>
  );
}

function SessionRow({ s, isNext }: { s: PlanSessionInfo; isNext: boolean }) {
  return (
    <li className={`${styles.planSession} ${isNext ? styles.planSessionNext : ''}`}>
      <span
        className={`${styles.planDot} ${s.status === 'done' ? styles.planDotDone : s.status === 'skipped' ? styles.planDotSkipped : ''}`}
        aria-label={s.status}
      >
        {s.status === 'done' ? '✓' : s.status === 'skipped' ? '–' : s.number}
      </span>
      <span className={styles.planSessionBody}>
        <span className={styles.planSessionTitle}>{s.session.title}</span>
        <span className={styles.planSessionSummary}>{s.session.summary}</span>
      </span>
    </li>
  );
}

/** Plan card + week-by-week list for the Running page */
export function RunPlanSection() {
  const progress = useRunPlanProgress();
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  if (progress === undefined) return null;

  if (progress === null || progress.finished) {
    return (
      <section className={styles.section} aria-label="Training plan">
        {progress?.finished && <PlanToday progress={progress} />}
        <div className={`surface ${styles.planCard}`}>
          <span className={styles.planTitle}>Training plan</span>
          <p className={styles.planSummary}>
            Follow a plan on your own schedule. Runs you log tick sessions off automatically.
          </p>
          <div className={styles.planActions}>
            <Button size="sm" onClick={() => setIsStartOpen(true)}>Choose a plan</Button>
            {progress?.finished && (
              <Button size="sm" variant="ghost" onClick={() => endRunPlan()}>Clear finished plan</Button>
            )}
          </div>
        </div>
        <StartPlanModal isOpen={isStartOpen} onClose={() => setIsStartOpen(false)} />
      </section>
    );
  }

  const currentWeek = progress.next?.week ?? progress.plan.weeks.length;
  const weeks = progress.plan.weeks.map((_, w) => progress.sessions.filter((s) => s.week === w + 1));
  const shownWeeks = showAll ? weeks : weeks.slice(currentWeek - 1, currentWeek);

  return (
    <section className={styles.section} aria-label="Training plan">
      <h2 className="section-title">Training plan</h2>
      <PlanToday progress={progress} />
      <div className={styles.planProgress} aria-hidden="true">
        <span style={{ width: `${(progress.position / progress.total) * 100}%` }} />
      </div>
      <div className={`surface ${styles.planWeeks}`}>
        {shownWeeks.map((sessions) => (
          <div key={sessions[0].week} className={styles.planWeek}>
            <span className="eyebrow">Week {sessions[0].week}</span>
            <ol className={styles.planSessionList}>
              {sessions.map((s) => (
                <SessionRow key={s.index} s={s} isNext={s.index === progress.next?.index} />
              ))}
            </ol>
          </div>
        ))}
        <div className={styles.planFooter}>
          <button type="button" className={styles.linkBtn} onClick={() => setShowAll((x) => !x)}>
            {showAll ? 'Show this week only' : `Show all ${progress.plan.weeks.length} weeks`}
          </button>
          <button type="button" className={`${styles.linkBtn} ${styles.linkBtnDanger}`} onClick={() => setConfirmEnd(true)}>
            End plan
          </button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        onConfirm={endRunPlan}
        title="End plan"
        message="Stop following this plan? Your runs are kept."
        confirmLabel="End plan"
        variant="danger"
      />
    </section>
  );
}

/** Compact plan card for Home — renders nothing without an active plan */
export function HomePlanCard({ className }: { className?: string }) {
  const progress = useRunPlanProgress();
  if (!progress) return null;
  return (
    <section className={className} aria-label="Running plan">
      <PlanToday progress={progress} compact />
    </section>
  );
}
