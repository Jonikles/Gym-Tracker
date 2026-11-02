import { RUN_PLAN_MAP, type PlanSession, type RunPlan } from '../data/runPlans';
import type { Run, RunPlanState } from '../types';
import { startOfLocalDay } from './session';

export type PlanSessionStatus = 'done' | 'skipped' | 'pending';

export interface PlanSessionInfo {
  week: number; // 1-based
  number: number; // 1-based within the week
  index: number; // 0-based across the plan
  session: PlanSession;
  status: PlanSessionStatus;
  date?: number; // day it was done / skipped
  runId?: string; // the run that completed it
}

export interface PlanProgress {
  plan: RunPlan;
  state: RunPlanState;
  sessions: PlanSessionInfo[];
  /** Sessions completed or skipped */
  position: number;
  total: number;
  finished: boolean;
  /** The next session to do (undefined when finished) */
  next?: PlanSessionInfo;
  /** What happened today, if anything: today's run or mark used up a session */
  todayCredit?: PlanSessionInfo;
  isTrainingDay: boolean;
  /** Next training day after today (local midnight) */
  nextTrainingDay?: number;
}

/**
 * Work out where the user is in their plan. Each day with a run (on/after the
 * plan start) or a manual mark moves the plan on by one session — at most one
 * per day, and a run beats a "skipped" mark on the same day.
 */
export function computePlanProgress(state: RunPlanState, runs: Run[], today: number): PlanProgress | undefined {
  const plan = RUN_PLAN_MAP[state.planId];
  if (!plan) return undefined;

  const credits = new Map<number, { kind: 'done' | 'skipped'; runId?: string }>();
  for (const mark of state.marks) {
    if (mark.date >= state.startedAt) credits.set(mark.date, { kind: mark.kind });
  }
  for (const run of [...runs].sort((a, b) => a.startedAt - b.startedAt)) {
    const day = startOfLocalDay(run.startedAt);
    if (day < state.startedAt) continue;
    const existing = credits.get(day);
    if (!existing || existing.kind === 'skipped' || !existing.runId) credits.set(day, { kind: 'done', runId: run.id });
  }
  const creditDays = [...credits.keys()].sort((a, b) => a - b);

  const sessions: PlanSessionInfo[] = plan.weeks.flatMap((week, w) =>
    week.map((session, n) => ({ week: w + 1, number: n + 1, index: 0, session, status: 'pending' as const }))
  );
  sessions.forEach((s, i) => {
    s.index = i;
    const day = creditDays[i];
    if (day == null) return;
    const credit = credits.get(day)!;
    s.status = credit.kind;
    s.date = day;
    s.runId = credit.runId;
  });

  const position = Math.min(creditDays.length, sessions.length);
  const todayDow = new Date(today).getDay();
  let nextTrainingDay: number | undefined;
  if (state.days.length > 0) {
    for (let offset = 1; offset <= 7; offset++) {
      const d = new Date(today);
      const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
      if (state.days.includes(candidate.getDay())) {
        nextTrainingDay = candidate.getTime();
        break;
      }
    }
  }

  return {
    plan,
    state,
    sessions,
    position,
    total: sessions.length,
    finished: position >= sessions.length,
    next: sessions[position],
    todayCredit: sessions.find((s) => s.date === today),
    isTrainingDay: state.days.includes(todayDow) && today >= state.startedAt,
    nextTrainingDay,
  };
}

export function planLabel(s: Pick<PlanSessionInfo, 'week' | 'number'>): string {
  return `Week ${s.week} · Run ${s.number}`;
}
