import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, ConfirmDialog } from '../components/common';
import { useRoutine, useTodaysTemplate } from '../hooks/useRoutines';
import {
  startSessionFromTemplate,
  skipWorkout,
  markSick,
  useTodaysSession,
} from '../hooks/useSessions';
import { useSessionContext } from '../context/SessionContext';
import { useSetting } from '../hooks/useSettings';
import { useStreaks } from '../hooks/useStreaks';
import { useToday } from '../hooks/useToday';
import { db } from '../db';
import { isRealWorkout, startOfLocalDay } from '../utils/session';
import type { Routine, Session, Template, Set as WorkoutSet } from '../types';
import styles from './Home.module.css';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_PREVIEW_EXERCISES = 8;

/* ════════════════════════════════════════
   Small helpers
   ════════════════════════════════════════ */

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatRelativeDay(ts: number, today: number): string {
  const day = startOfLocalDay(ts);
  const diffDays = Math.round((today - day) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return WEEKDAY_LONG[new Date(ts).getDay()];
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTopSet(set: WorkoutSet): string | null {
  if (set.weight != null && set.weight > 0 && set.reps != null) return `${set.weight} kg × ${set.reps}`;
  if (set.reps != null && set.reps > 0) return `${set.reps} reps`;
  if (set.time != null && set.time > 0) return `${set.time}s`;
  if (set.distance != null && set.distance > 0) return `${set.distance} m`;
  return null;
}

/** Heaviest working set (then most reps / longest time) */
function pickTopSet(sets: WorkoutSet[]): WorkoutSet | undefined {
  let best: WorkoutSet | undefined;
  for (const s of sets) {
    if (s.isWarmup) continue;
    if (!best) { best = s; continue; }
    const w = s.weight ?? 0, bw = best.weight ?? 0;
    if (w > bw) best = s;
    else if (w === bw && ((s.reps ?? 0) > (best.reps ?? 0) || (s.time ?? 0) > (best.time ?? 0))) best = s;
  }
  return best;
}

/** Next scheduled workout after today (fixed: next weekday with a template; rolling: current position onward) */
function findNextScheduled(
  routine: Routine | undefined,
  today: number,
  { skipCurrentRolling }: { skipCurrentRolling: boolean }
): { templateId: string; dayLabel?: string } | undefined {
  if (!routine || routine.schedule.length === 0) return undefined;
  if (routine.type === 'fixed') {
    const todayDow = new Date(today).getDay();
    for (let offset = 1; offset <= 7; offset++) {
      const dow = (todayDow + offset) % 7;
      const day = routine.schedule.find((s) => s.dayIndex === dow);
      if (day?.templateId) {
        return { templateId: day.templateId, dayLabel: offset === 1 ? 'Tomorrow' : WEEKDAY_LONG[dow] };
      }
    }
    return undefined;
  }
  const len = routine.schedule.length;
  const start = routine.currentPosition ?? 0;
  for (let offset = skipCurrentRolling ? 1 : 0; offset < len + 1; offset++) {
    const day = routine.schedule[(start + offset) % len];
    if (day?.templateId) return { templateId: day.templateId };
  }
  return undefined;
}

/* ════════════════════════════════════════
   Data hooks (read-only)
   ════════════════════════════════════════ */

interface PreviewRow {
  key: string;
  name: string;
  scheme: string;
  last: string | null;
  grouped: boolean;
}

/** Exercise names + set scheme + last time's top set for a template */
function useTemplatePreview(template: Template | undefined): PreviewRow[] | undefined {
  return useLiveQuery(async () => {
    if (!template) return [];
    const items = [...template.exercises].sort((a, b) => a.order - b.order);
    const ids = [...new Set(items.map((e) => e.exerciseId))];
    const exercises = await db.exercises.bulkGet(ids);
    const nameById = new Map(exercises.filter(Boolean).map((e) => [e!.id, e!.name]));

    // Last time: most recent completed session's sets for each exercise
    const lastById = new Map<string, string>();
    try {
      const sessionExercises = await db.sessionExercises.where('exerciseId').anyOf(ids).toArray();
      const byExercise = new Map<string, typeof sessionExercises>();
      for (const se of sessionExercises) {
        const list = byExercise.get(se.exerciseId) ?? [];
        list.push(se);
        byExercise.set(se.exerciseId, list);
      }
      const candidates: typeof sessionExercises = [];
      for (const list of byExercise.values()) {
        list.sort((a, b) => b.createdAt - a.createdAt);
        candidates.push(...list.slice(0, 3));
      }
      const sessionIds = [...new Set(candidates.map((c) => c.sessionId))];
      const sessions = await db.sessions.bulkGet(sessionIds);
      const realSessionIds = new Set(sessions.filter((s): s is Session => !!s && isRealWorkout(s)).map((s) => s.id));
      const chosen = new Map<string, string>(); // exerciseId -> sessionExerciseId
      for (const [exId, list] of byExercise) {
        const pick = list.slice(0, 3).find((se) => realSessionIds.has(se.sessionId));
        if (pick) chosen.set(exId, pick.id);
      }
      if (chosen.size > 0) {
        const sets = await db.sets.where('sessionExerciseId').anyOf([...chosen.values()]).toArray();
        const setsBySe = new Map<string, WorkoutSet[]>();
        for (const s of sets) {
          const list = setsBySe.get(s.sessionExerciseId) ?? [];
          list.push(s);
          setsBySe.set(s.sessionExerciseId, list);
        }
        for (const [exId, seId] of chosen) {
          const top = pickTopSet(setsBySe.get(seId) ?? []);
          const label = top ? formatTopSet(top) : null;
          if (label) lastById.set(exId, label);
        }
      }
    } catch (err) {
      console.warn('Could not load last-time sets for preview', err);
    }

    return items.map((item, i) => {
      const working = item.sets.filter((s) => !s.isWarmup).length || item.sets.length;
      const reps = item.targetReps?.trim();
      return {
        key: `${item.exerciseId}-${i}`,
        name: nameById.get(item.exerciseId) ?? 'Exercise',
        scheme: reps ? `${working}×${reps}` : `${working} sets`,
        last: lastById.get(item.exerciseId) ?? null,
        grouped: !!item.groupId,
      };
    });
  }, [template?.id, template?.updatedAt]);
}

type DayState = 'done' | 'skipped' | 'sick' | 'scheduled' | 'missed' | 'rest';

interface WeekDay {
  ts: number;
  letter: string;
  date: number;
  isToday: boolean;
  isFuture: boolean;
  state: DayState;
}

/** The current week (respecting weekStartDay) with each day's status */
function useWeekStrip(weekStartDay: number, routine: Routine | undefined, today: number): WeekDay[] | undefined {
  return useLiveQuery(async () => {
    const t = new Date(today);
    const diff = (t.getDay() - weekStartDay + 7) % 7;
    const days = Array.from({ length: 7 }, (_, i) => new Date(t.getFullYear(), t.getMonth(), t.getDate() - diff + i));
    const weekStart = days[0].getTime();
    const weekEnd = new Date(t.getFullYear(), t.getMonth(), t.getDate() - diff + 7).getTime();

    const sessions = await db.sessions.where('startedAt').between(weekStart, weekEnd, true, false).toArray();
    const byDay = new Map<number, Session[]>();
    for (const s of sessions) {
      const key = startOfLocalDay(s.startedAt);
      const list = byDay.get(key) ?? [];
      list.push(s);
      byDay.set(key, list);
    }

    return days.map((d) => {
      const ts = d.getTime();
      const daySessions = byDay.get(ts) ?? [];
      const scheduled =
        routine?.type === 'fixed' && !!routine.schedule.find((s) => s.dayIndex === d.getDay())?.templateId;
      let state: DayState;
      if (daySessions.some(isRealWorkout)) state = 'done';
      else if (daySessions.some((s) => s.status === 'sick')) state = 'sick';
      else if (daySessions.some((s) => s.status === 'skipped')) state = 'skipped';
      else if (scheduled) state = ts < today ? 'missed' : 'scheduled';
      else state = 'rest';
      return {
        ts,
        letter: WEEKDAY_SHORT[d.getDay()].charAt(0),
        date: d.getDate(),
        isToday: ts === today,
        isFuture: ts > today,
        state,
      };
    });
  }, [weekStartDay, routine?.id, routine?.updatedAt, today]);
}

interface LastWorkoutInfo {
  id: string;
  name: string;
  startedAt: number;
  duration: number | null;
  exerciseCount: number;
}

function useLastWorkout(): LastWorkoutInfo | null | undefined {
  return useLiveQuery(async () => {
    const last = await db.sessions.orderBy('startedAt').reverse().filter(isRealWorkout).first();
    if (!last) return null;
    const [template, exerciseCount] = await Promise.all([
      last.templateId ? db.templates.get(last.templateId) : Promise.resolve(undefined),
      db.sessionExercises.where('sessionId').equals(last.id).count(),
    ]);
    return {
      id: last.id,
      name: template?.name ?? 'Workout',
      startedAt: last.startedAt,
      duration: last.completedAt ? last.completedAt - last.startedAt : null,
      exerciseCount,
    };
  }, []);
}

function useTemplateName(id: string | undefined): string | undefined {
  return useLiveQuery(async () => (id ? (await db.templates.get(id))?.name : undefined), [id]);
}

/* ════════════════════════════════════════
   Presentational pieces
   ════════════════════════════════════════ */

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function CrossIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M17 7 7 17M7 7l10 10" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

const DAY_STATE_LABEL: Record<DayState, string> = {
  done: 'workout done',
  skipped: 'skipped',
  sick: 'sick day',
  scheduled: 'workout scheduled',
  missed: 'scheduled, not logged',
  rest: 'rest day',
};

function WeekStrip({ days }: { days: WeekDay[] }) {
  const doneCount = days.filter((d) => d.state === 'done').length;
  const plannedCount = days.filter((d) => d.state !== 'rest').length;
  return (
    <section className={styles.section} aria-label="This week">
      <div className={styles.sectionHeader}>
        <h2 className="section-title">This week</h2>
        <span className={styles.sectionMeta}>
          <span className="num">{doneCount}</span>
          {plannedCount > doneCount ? <> / <span className="num">{plannedCount}</span></> : null} done
        </span>
      </div>
      <ol className={`surface ${styles.week}`}>
        {days.map((d) => (
          <li
            key={d.ts}
            className={`${styles.day} ${d.isToday ? styles.dayToday : ''}`}
            aria-label={`${WEEKDAY_LONG[new Date(d.ts).getDay()]} ${d.date}: ${DAY_STATE_LABEL[d.state]}`}
          >
            <span className={styles.dayLetter}>{d.letter}</span>
            <span className={`${styles.dayDot} ${styles[`dot_${d.state}`]}`}>
              {d.state === 'done' && <CheckIcon />}
              {d.state === 'skipped' && <CrossIcon />}
              {d.state === 'sick' && <CrossIcon />}
              {d.state !== 'done' && d.state !== 'skipped' && d.state !== 'sick' && (
                <span className="num">{d.date}</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StatsRow() {
  const streaks = useStreaks();
  if (!streaks || streaks.totalWorkouts === 0) return null;
  return (
    <section className={styles.stats} aria-label="Stats">
      <div className={`${styles.stat} ${styles.statStreak}`}>
        <span className={styles.statValue}>{streaks.currentStreak}</span>
        <span className={styles.statLabel}>Streak</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statValue}>{streaks.longestStreak}</span>
        <span className={styles.statLabel}>Best</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statValue}>{streaks.totalWorkouts}</span>
        <span className={styles.statLabel}>Workouts</span>
      </div>
    </section>
  );
}

function ExercisePreview({ rows }: { rows: PreviewRow[] | undefined }) {
  if (!rows) {
    return <div className={styles.previewPlaceholder} aria-hidden="true" />;
  }
  if (rows.length === 0) {
    return <p className={styles.heroText}>No exercises in this template yet.</p>;
  }
  const shown = rows.slice(0, MAX_PREVIEW_EXERCISES);
  const hidden = rows.length - shown.length;
  return (
    <ul className={styles.preview}>
      {shown.map((r) => (
        <li key={r.key} className={`${styles.previewRow} ${r.grouped ? styles.previewGrouped : ''}`}>
          <div className={styles.previewMain}>
            <span className={styles.previewName}>{r.name}</span>
            {r.last && <span className={styles.previewLast}>Last: {r.last}</span>}
          </div>
          <span className={styles.previewScheme}>{r.scheme}</span>
        </li>
      ))}
      {hidden > 0 && <li className={styles.previewMore}>+{hidden} more</li>}
    </ul>
  );
}

/* ════════════════════════════════════════
   Page
   ════════════════════════════════════════ */

export function Home() {
  const navigate = useNavigate();
  const { activeSession, startBlank, isLoading } = useSessionContext();
  const today = useToday();

  // Get active routine from settings
  const activeRoutineId = useSetting('activeRoutineId');
  const activeRoutine = useRoutine(activeRoutineId ?? undefined);

  // Get week start day setting
  const weekStartDay = useSetting('weekStartDay');

  // Get today's template based on active routine
  const todaysWorkout = useTodaysTemplate(weekStartDay);

  // Get today's session if already completed
  const todaysSession = useTodaysSession(activeRoutineId);

  const preview = useTemplatePreview(todaysWorkout?.template);
  const weekDays = useWeekStrip(weekStartDay ?? 0, activeRoutine, today);
  const lastWorkout = useLastWorkout();
  const activeTemplateName = useTemplateName(activeSession?.templateId);
  const todaysSessionTemplateName = useTemplateName(todaysSession?.templateId);

  const isRestDay = todaysWorkout === undefined || !todaysWorkout.template;
  const next = useMemo(
    () =>
      findNextScheduled(activeRoutine, today, {
        // Rolling: after logging today the position has already advanced
        skipCurrentRolling: !todaysSession && !isRestDay,
      }),
    [activeRoutine, today, todaysSession, isRestDay]
  );
  const nextName = useTemplateName(next?.templateId);

  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showSickConfirm, setShowSickConfirm] = useState(false);

  // Guards against double taps starting two workouts / logging twice
  const [isBusy, setIsBusy] = useState(false);
  const busyRef = useRef(false);
  const runGuarded = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsBusy(true);
    try {
      await action();
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  };
  const busy = isBusy || isLoading;
  const handleStartBlank = () => runGuarded(startBlank);

  const handleStartFromTemplate = () =>
    runGuarded(async () => {
      if (!todaysWorkout) return;
      await startSessionFromTemplate(todaysWorkout.template.id, todaysWorkout.routine.id);
      navigate('/workout');
    });

  const handleSkip = () =>
    runGuarded(async () => {
      if (!todaysWorkout) return;
      await skipWorkout(todaysWorkout.routine.id, todaysWorkout.template.id);
      setShowSkipConfirm(false);
    });

  const handleSick = () =>
    runGuarded(async () => {
      if (!todaysWorkout) return;
      await markSick(todaysWorkout.routine.id, todaysWorkout.template.id);
      setShowSickConfirm(false);
    });

  const now = new Date();
  const hasRoutine = !!activeRoutineId && !!activeRoutine;

  const nextLine = next && nextName && (
    <p className={styles.nextLine}>
      <span className={styles.nextLabel}>Next</span>
      <span className={styles.nextName}>{nextName}</span>
      {next.dayLabel && <span className={styles.nextDay}>· {next.dayLabel}</span>}
    </p>
  );

  /* ── Hero card content by state ── */
  let hero: ReactNode;
  let showBlankLink = false;

  if (activeSession) {
    hero = (
      <div className={`surface-hero ${styles.hero}`}>
        <div className={styles.heroTop}>
          <span className="chip chip-success">
            <span className={styles.liveDot} aria-hidden="true" />
            In progress
          </span>
          <span className={styles.heroMeta}>Started {formatTime(activeSession.startedAt)}</span>
        </div>
        <h2 className={styles.heroTitle}>{activeTemplateName ?? 'Workout'}</h2>
        <p className={styles.heroText}>Pick up where you left off.</p>
        <Button size="lg" className={styles.heroCta} onClick={() => navigate('/workout')}>
          Continue Workout
        </Button>
      </div>
    );
  } else if (todaysSession) {
    const status = todaysSession.status ?? 'completed';
    hero = (
      <div className={`surface-hero ${styles.hero}`}>
        <div className={styles.heroTop}>
          {status === 'completed' && (
            <span className="chip chip-accent"><CheckIcon size={12} /> Done today</span>
          )}
          {status === 'skipped' && <span className="chip">Skipped</span>}
          {status === 'sick' && <span className="chip chip-warning">Sick day</span>}
        </div>
        <h2 className={styles.heroTitle}>
          {todaysSessionTemplateName ?? todaysWorkout?.template.name ?? 'Workout'}
        </h2>
        {status === 'completed' && todaysSession.completedAt && (
          <p className={styles.heroText}>
            Finished in <span className="num">{formatDuration(todaysSession.completedAt - todaysSession.startedAt)}</span>
            {' '}· nice work.
          </p>
        )}
        {status !== 'completed' && <p className={styles.heroText}>Rest up — back at it next time.</p>}
        {nextLine}
        <div className={styles.heroActions}>
          {status === 'completed' && (
            <Button variant="secondary" onClick={() => navigate(`/history/${todaysSession.id}`)}>
              View Details
            </Button>
          )}
          <Button variant="secondary" onClick={handleStartBlank} disabled={busy}>
            Start Another Workout
          </Button>
        </div>
      </div>
    );
  } else if (!hasRoutine) {
    hero = (
      <div className={`surface-hero ${styles.hero}`}>
        <h2 className={styles.heroTitle}>No routine selected</h2>
        <p className={styles.heroText}>
          Pick a routine to get a daily plan, or just start logging.
        </p>
        <Button size="lg" className={styles.heroCta} onClick={() => navigate('/routines')}>
          Choose a Routine
        </Button>
        <div className={styles.heroActions}>
          <Button variant="secondary" onClick={handleStartBlank} disabled={busy}>
            Start Blank Workout
          </Button>
        </div>
      </div>
    );
  } else if (isRestDay || !todaysWorkout) {
    hero = (
      <div className={`surface-hero ${styles.hero} ${styles.heroRest}`}>
        <div className={styles.heroTop}>
          <span className="chip">Rest day</span>
        </div>
        <h2 className={styles.heroTitle}>Recover &amp; recharge</h2>
        <p className={styles.heroText}>Nothing scheduled today. Muscles grow on rest days.</p>
        {nextLine}
        <div className={styles.heroActions}>
          <Button variant="secondary" onClick={handleStartBlank} disabled={busy}>
            Start Unplanned Workout
          </Button>
        </div>
      </div>
    );
  } else {
    showBlankLink = true;
    hero = (
      <div className={`surface-hero ${styles.hero}`}>
        <div className={styles.heroTop}>
          <span className="chip chip-accent">Today</span>
          {preview && preview.length > 0 && (
            <span className={styles.heroMeta}>
              <span className="num">{preview.length}</span> exercises
            </span>
          )}
        </div>
        <h2 className={styles.heroTitle}>
          <Link to={`/templates/${todaysWorkout.template.id}`} className={styles.heroTitleLink}>
            {todaysWorkout.template.name}
          </Link>
        </h2>
        <ExercisePreview rows={preview} />
        <Button
          size="lg"
          className={styles.heroCta}
          onClick={handleStartFromTemplate}
          disabled={busy}
          aria-busy={isBusy}
        >
          {isBusy ? 'Starting…' : 'Start Workout'}
        </Button>
        <div className={styles.heroActions}>
          <Button variant="secondary" size="sm" onClick={() => setShowSkipConfirm(true)} disabled={busy}>
            Skip today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowSickConfirm(true)} disabled={busy}>
            Sick day
          </Button>
        </div>
      </div>
    );
  }

  const showLastWorkout =
    !!lastWorkout && lastWorkout.id !== todaysSession?.id;

  return (
    <div className="page">
      <header className={styles.header}>
        {hasRoutine ? (
          <Link to={`/routines/${activeRoutine.id}`} className={`eyebrow ${styles.routineLink}`}>
            <span className={styles.routineName}>{activeRoutine.name}</span>
            <ChevronIcon />
          </Link>
        ) : (
          <span className="eyebrow">Gym Tracker</span>
        )}
        <h1 className={`page-title ${styles.greeting}`}>{greetingFor(now)}</h1>
        <p className={styles.date}>
          {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      {hero}

      {showBlankLink && (
        <button type="button" className={styles.blankLink} onClick={handleStartBlank} disabled={busy}>
          or start a blank workout
        </button>
      )}

      {weekDays && <WeekStrip days={weekDays} />}

      <StatsRow />

      {showLastWorkout && lastWorkout && (
        <section className={styles.section} aria-label="Last workout">
          <h2 className="section-title">Last workout</h2>
          <Link to={`/history/${lastWorkout.id}`} className={`surface ${styles.lastCard}`}>
            <div className={styles.lastMain}>
              <span className={styles.lastName}>{lastWorkout.name}</span>
              <span className={styles.lastMeta}>
                {formatRelativeDay(lastWorkout.startedAt, today)}
                {lastWorkout.duration != null && <> · <span className="num">{formatDuration(lastWorkout.duration)}</span></>}
                {lastWorkout.exerciseCount > 0 && (
                  <> · <span className="num">{lastWorkout.exerciseCount}</span> exercise{lastWorkout.exerciseCount === 1 ? '' : 's'}</>
                )}
              </span>
            </div>
            <span className={styles.lastChevron}><ChevronIcon /></span>
          </Link>
        </section>
      )}

      {/* Skip Confirmation */}
      <ConfirmDialog
        isOpen={showSkipConfirm}
        onClose={() => setShowSkipConfirm(false)}
        onConfirm={handleSkip}
        title="Skip Workout"
        message="Mark today's workout as skipped? This will move to the next day in your routine."
        confirmLabel="Skip"
        variant="danger"
      />

      {/* Sick Confirmation */}
      <ConfirmDialog
        isOpen={showSickConfirm}
        onClose={() => setShowSickConfirm(false)}
        onConfirm={handleSick}
        title="Mark as Sick"
        message="Mark today as a sick day? This will move to the next day in your routine."
        confirmLabel="Mark Sick"
        variant="danger"
      />
    </div>
  );
}
