import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input } from '../common';
import { RUN_PLAN_MAP, segmentsDuration, type SegmentKind, type TimerSegment } from '../../data/runPlans';
import { useSetting } from '../../hooks/useSettings';
import { formatRunTime } from '../../utils/run';
import { planLabel } from '../../utils/runPlan';
import styles from './IntervalTimer.module.css';

/**
 * Optional run/walk interval timer. Standalone: it doesn't log anything or gate
 * any other feature, and leaving the screen simply stops it.
 */

const KIND_LABEL: Record<SegmentKind, string> = { warmup: 'Warm-up walk', run: 'Run', walk: 'Walk', cooldown: 'Cool-down walk' };
const CUSTOM_KEY = 'runTimer.custom';

interface CustomSetup {
  warmupMin: number;
  reps: number;
  runSec: number;
  walkSec: number;
  cooldownMin: number;
}

const DEFAULT_CUSTOM: CustomSetup = { warmupMin: 5, reps: 8, runSec: 60, walkSec: 90, cooldownMin: 5 };

function loadCustom(): CustomSetup {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? { ...DEFAULT_CUSTOM, ...JSON.parse(raw) } : DEFAULT_CUSTOM;
  } catch {
    return DEFAULT_CUSTOM;
  }
}

function buildCustom(c: CustomSetup): TimerSegment[] {
  const segs: TimerSegment[] = [];
  if (c.warmupMin > 0) segs.push({ kind: 'warmup', seconds: c.warmupMin * 60 });
  for (let i = 0; i < c.reps; i++) {
    if (c.runSec > 0) segs.push({ kind: 'run', seconds: c.runSec });
    if (c.walkSec > 0 && i < c.reps - 1) segs.push({ kind: 'walk', seconds: c.walkSec });
  }
  if (c.cooldownMin > 0) segs.push({ kind: 'cooldown', seconds: c.cooldownMin * 60 });
  return segs;
}

// ── Sound / vibration / screen ──

let audioCtx: AudioContext | null = null;
function beep(frequency: number, ms: number, times = 1) {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    for (let i = 0; i < times; i++) {
      const start = ctx.currentTime + i * (ms / 1000 + 0.08);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + ms / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + ms / 1000 + 0.02);
    }
  } catch {
    // No audio available — the screen still shows everything
  }
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => undefined);
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release();
    };
  }, [active]);
}

// ── Timer engine ──

type Phase = 'ready' | 'running' | 'paused' | 'done';

function useIntervalRunner(segments: TimerSegment[]) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [index, setIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(() => (segments[0]?.seconds ?? 0) * 1000);
  // While running, the current segment ends at this wall-clock time (robust to throttled timers)
  const endsAt = useRef(0);
  const lastWholeSecond = useRef<number | null>(null);

  const startSegment = useCallback(
    (i: number, now = Date.now()) => {
      setIndex(i);
      endsAt.current = now + segments[i].seconds * 1000;
      setRemainingMs(segments[i].seconds * 1000);
      lastWholeSecond.current = null;
      const kind = segments[i].kind;
      beep(kind === 'run' ? 880 : 560, 220, kind === 'run' ? 2 : 1);
      vibrate(kind === 'run' ? [200, 100, 200] : 300);
    },
    [segments]
  );

  useEffect(() => {
    if (phase !== 'running') return;
    const tick = () => {
      const now = Date.now();
      let left = endsAt.current - now;
      if (left <= 0) {
        // Move on — possibly several segments if the screen was off for a while
        let i = index;
        let over = -left;
        while (left <= 0 && i < segments.length - 1) {
          i++;
          left = segments[i].seconds * 1000 - over;
          over = -left;
        }
        if (left <= 0) {
          setPhase('done');
          setRemainingMs(0);
          beep(988, 400, 3);
          vibrate([300, 150, 300, 150, 300]);
          return;
        }
        startSegment(i, now - (segments[i].seconds * 1000 - left));
        return;
      }
      const whole = Math.ceil(left / 1000);
      if (whole <= 3 && whole !== lastWholeSecond.current) beep(660, 90); // 3-2-1 before a change
      lastWholeSecond.current = whole;
      setRemainingMs(left);
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [phase, index, segments, startSegment]);

  return {
    phase,
    index,
    remainingMs,
    start: () => {
      setPhase('running');
      startSegment(0);
    },
    pause: () => {
      setRemainingMs(Math.max(0, endsAt.current - Date.now()));
      setPhase('paused');
    },
    resume: () => {
      endsAt.current = Date.now() + remainingMs;
      setPhase('running');
    },
    skip: () => {
      if (index >= segments.length - 1) setPhase('done');
      else startSegment(index + 1);
    },
  };
}

// ── UI ──

function TimerRun({ segments, title, onExit }: { segments: TimerSegment[]; title: string; onExit: () => void }) {
  const t = useIntervalRunner(segments);
  useWakeLock(t.phase === 'running');

  const seg = segments[t.index];
  const next = segments[t.index + 1];
  const runCount = segments.filter((s) => s.kind === 'run').length;
  const runNumber = segments.slice(0, t.index + 1).filter((s) => s.kind === 'run').length;
  const elapsedBefore = segmentsDuration(segments.slice(0, t.index));
  const totalLeft = segmentsDuration(segments) - elapsedBefore - seg.seconds + t.remainingMs / 1000;

  const kindClass = t.phase === 'done' ? styles.done : styles[seg.kind];

  return (
    <div className={`${styles.runner} ${kindClass}`}>
      <div className={styles.runnerTop}>
        <span className={styles.runnerTitle}>{title}</span>
        <span className="num">{formatRunTime(Math.max(0, totalLeft))} left</span>
      </div>

      <div className={styles.display} aria-live="polite">
        {t.phase === 'done' ? (
          <>
            <span className={styles.phaseLabel}>Finished</span>
            <span className={styles.bigTime}>🎉</span>
          </>
        ) : (
          <>
            <span className={styles.phaseLabel}>{KIND_LABEL[seg.kind]}</span>
            <span className={`num ${styles.bigTime}`}>{formatRunTime(Math.ceil(t.remainingMs / 1000))}</span>
            {seg.kind === 'run' && runCount > 1 && (
              <span className={`num ${styles.subLabel}`}>Run {runNumber} of {runCount}</span>
            )}
            {next && (
              <span className={`num ${styles.subLabel}`}>Next: {KIND_LABEL[next.kind]} {formatRunTime(next.seconds)}</span>
            )}
          </>
        )}
      </div>

      <div className={styles.controls}>
        {t.phase === 'ready' && <Button size="lg" onClick={t.start} className={styles.mainBtn}>Start</Button>}
        {t.phase === 'running' && <Button size="lg" variant="secondary" onClick={t.pause} className={styles.mainBtn}>Pause</Button>}
        {t.phase === 'paused' && <Button size="lg" onClick={t.resume} className={styles.mainBtn}>Resume</Button>}
        {(t.phase === 'running' || t.phase === 'paused') && (
          <Button variant="secondary" onClick={t.skip}>Skip</Button>
        )}
        <Button variant="ghost" onClick={onExit}>{t.phase === 'done' ? 'Close' : 'Stop'}</Button>
      </div>
      {t.phase !== 'done' && (
        <p className={styles.note}>Keeps the screen on. Sounds stop if you leave the app.</p>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max: number }) {
  return (
    <Input
      label={label}
      inputMode="numeric"
      value={String(value)}
      onChange={(e) => {
        const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10);
        onChange(Math.min(max, n));
      }}
    />
  );
}

function CustomSetupForm({ onStart }: { onStart: (segments: TimerSegment[]) => void }) {
  const [c, setC] = useState<CustomSetup>(loadCustom);
  const set = (patch: Partial<CustomSetup>) => setC((prev) => ({ ...prev, ...patch }));
  const segments = useMemo(() => buildCustom(c), [c]);

  return (
    <div className={styles.setup}>
      <div className={styles.setupGrid}>
        <NumberField label="Repeats" value={c.reps} max={50} onChange={(reps) => set({ reps })} />
        <NumberField label="Run (sec)" value={c.runSec} max={3600} onChange={(runSec) => set({ runSec })} />
        <NumberField label="Walk (sec)" value={c.walkSec} max={3600} onChange={(walkSec) => set({ walkSec })} />
        <NumberField label="Warm-up (min)" value={c.warmupMin} max={60} onChange={(warmupMin) => set({ warmupMin })} />
        <NumberField label="Cool-down (min)" value={c.cooldownMin} max={60} onChange={(cooldownMin) => set({ cooldownMin })} />
      </div>
      <p className={styles.note}>
        Total <span className="num">{formatRunTime(segmentsDuration(segments))}</span>
      </p>
      <Button
        size="lg"
        disabled={segments.length === 0}
        onClick={() => {
          try {
            localStorage.setItem(CUSTOM_KEY, JSON.stringify(c));
          } catch {
            // not remembered — fine
          }
          onStart(segments);
        }}
      >
        Set up timer
      </Button>
    </div>
  );
}

export function IntervalTimer() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const runPlan = useSetting('runPlan');
  const [custom, setCustom] = useState<TimerSegment[] | null>(null);

  // A plan session, when opened from the plan card (?session=<index>)
  const planSession = useMemo(() => {
    const idx = params.get('session');
    const plan = runPlan ? RUN_PLAN_MAP[runPlan.planId] : undefined;
    if (idx == null || !plan) return undefined;
    const flat = plan.weeks.flatMap((week, w) => week.map((session, n) => ({ session, week: w + 1, number: n + 1 })));
    const hit = flat[Number(idx)];
    return hit?.session.segments ? { ...hit, segments: hit.session.segments } : undefined;
  }, [params, runPlan]);

  const exit = () => navigate(-1);

  if (planSession && !custom) {
    return <TimerRun segments={planSession.segments} title={`${planLabel(planSession)} · ${planSession.session.title}`} onExit={exit} />;
  }
  if (custom) {
    return <TimerRun segments={custom} title="Intervals" onExit={() => setCustom(null)} />;
  }

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={exit}>‹ Back</button>
      <h1 className="page-title">Interval timer</h1>
      <p className={styles.note}>Optional — for run/walk or interval sessions. Nothing here is saved.</p>
      <CustomSetupForm onStart={setCustom} />
    </div>
  );
}
