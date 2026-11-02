/**
 * Built-in running plans. Sessions are done in order on the user's chosen
 * training days; a plan session never requires the interval timer — `segments`
 * only lets the optional timer pre-load it.
 */

export type SegmentKind = 'warmup' | 'run' | 'walk' | 'cooldown';

export interface TimerSegment {
  kind: SegmentKind;
  seconds: number;
}

export interface PlanSession {
  title: string; // "Run/walk intervals"
  summary: string; // "8 × (1 min run · 1:30 walk)"
  segments?: TimerSegment[];
}

export interface RunPlan {
  id: string;
  name: string;
  description: string;
  sessionsPerWeek: number;
  weeks: PlanSession[][];
}

const min = (m: number) => Math.round(m * 60);
const WARMUP: TimerSegment = { kind: 'warmup', seconds: min(5) };
const COOLDOWN: TimerSegment = { kind: 'cooldown', seconds: min(5) };

/** Warm-up, the given run/walk pattern, cool-down */
function intervals(...pattern: [SegmentKind, number][]): TimerSegment[] {
  return [WARMUP, ...pattern.map(([kind, m]) => ({ kind, seconds: min(m) })), COOLDOWN];
}

function repeat(times: number, runMin: number, walkMin: number): [SegmentKind, number][] {
  const out: [SegmentKind, number][] = [];
  for (let i = 0; i < times; i++) {
    out.push(['run', runMin]);
    if (i < times - 1) out.push(['walk', walkMin]); // the cool-down follows the last run
  }
  return out;
}

function same(session: PlanSession, n = 3): PlanSession[] {
  return Array.from({ length: n }, () => session);
}

const continuous = (m: number): PlanSession => ({
  title: `${m} min continuous run`,
  summary: `5 min walk · ${m} min easy run · 5 min walk`,
  segments: intervals(['run', m]),
});

const START_TO_5K: RunPlan = {
  id: 'start-to-5k',
  name: 'Start to 5K',
  description: 'From walking to 30 minutes of continuous running in 9 weeks, 3 runs a week.',
  sessionsPerWeek: 3,
  weeks: [
    same({ title: 'Run/walk intervals', summary: '8 × (1 min run · 1:30 walk)', segments: intervals(...repeat(8, 1, 1.5)) }),
    same({ title: 'Run/walk intervals', summary: '6 × (1:30 run · 2 min walk)', segments: intervals(...repeat(6, 1.5, 2)) }),
    same({
      title: 'Run/walk intervals',
      summary: '2 × (1:30 run · 1:30 walk · 3 min run · 3 min walk)',
      segments: intervals(['run', 1.5], ['walk', 1.5], ['run', 3], ['walk', 3], ['run', 1.5], ['walk', 1.5], ['run', 3], ['walk', 3]),
    }),
    same({
      title: 'Longer intervals',
      summary: '3 run · 1:30 walk · 5 run · 2:30 walk · 3 run · 1:30 walk · 5 run',
      segments: intervals(['run', 3], ['walk', 1.5], ['run', 5], ['walk', 2.5], ['run', 3], ['walk', 1.5], ['run', 5]),
    }),
    [
      { title: 'Longer intervals', summary: '3 × (5 min run · 3 min walk)', segments: intervals(...repeat(3, 5, 3)) },
      { title: 'Longer intervals', summary: '2 × (8 min run · 5 min walk)', segments: intervals(['run', 8], ['walk', 5], ['run', 8]) },
      continuous(20),
    ],
    [
      {
        title: 'Longer intervals',
        summary: '5 run · 3 walk · 8 run · 3 walk · 5 run',
        segments: intervals(['run', 5], ['walk', 3], ['run', 8], ['walk', 3], ['run', 5]),
      },
      { title: 'Longer intervals', summary: '2 × (10 min run · 3 min walk)', segments: intervals(['run', 10], ['walk', 3], ['run', 10]) },
      continuous(25),
    ],
    same(continuous(25)),
    same(continuous(28)),
    same(continuous(30)),
  ],
};

const easy = (km: number): PlanSession => ({ title: `Easy ${km} km`, summary: 'Conversational pace — you could talk in full sentences' });
const long = (km: number): PlanSession => ({ title: `Long run ${km} km`, summary: 'Slow and steady; walk breaks are fine' });

const FIVE_TO_TEN: RunPlan = {
  id: '5k-to-10k',
  name: '5K to 10K',
  description: 'Build from a comfortable 5 km to running 10 km in 8 weeks: easy run, quality run, long run.',
  sessionsPerWeek: 3,
  weeks: [
    [easy(4), { title: 'Strides', summary: '4 km easy + 6 × 20 s faster, walk back between' }, long(6)],
    [easy(4), { title: 'Intervals', summary: '1 km warm-up · 6 × 400 m hard / 400 m jog · 1 km cool-down' }, long(7)],
    [easy(5), { title: 'Tempo', summary: '1 km easy · 2 km comfortably hard · 1 km easy' }, long(7.5)],
    [easy(4), { title: 'Strides', summary: '4 km easy + 6 × 20 s faster (easier week)' }, long(6)],
    [easy(5), { title: 'Intervals', summary: '1 km warm-up · 5 × 800 m hard / 400 m jog · 1 km cool-down' }, long(8)],
    [easy(5), { title: 'Tempo', summary: '1 km easy · 3 km comfortably hard · 1 km easy' }, long(9)],
    [easy(5), { title: 'Intervals', summary: '1 km warm-up · 4 × 1 km at goal 10K pace / 2 min jog · 1 km cool-down' }, long(9.5)],
    [easy(4), { title: 'Shakeout', summary: '3 km easy + 4 × 20 s faster' }, { title: '10 km run', summary: 'Goal run — start easy, finish strong' }],
  ],
};

export const RUN_PLANS: RunPlan[] = [START_TO_5K, FIVE_TO_TEN];
export const RUN_PLAN_MAP: Record<string, RunPlan> = Object.fromEntries(RUN_PLANS.map((p) => [p.id, p]));

/** Total seconds of a timer program */
export function segmentsDuration(segments: TimerSegment[]): number {
  return segments.reduce((sum, s) => sum + s.seconds, 0);
}
