import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { RunPlanState } from '../types';
import { computePlanProgress, type PlanProgress } from '../utils/runPlan';
import { updateSetting } from './useSettings';
import { useToday } from './useToday';

async function getPlanState(): Promise<RunPlanState | null> {
  const s = await db.settings.get('runPlan');
  return (s?.value as RunPlanState | undefined) ?? null;
}

/** Progress through the active plan: null = no plan, undefined = loading */
export function useRunPlanProgress(): PlanProgress | null | undefined {
  const today = useToday();
  return useLiveQuery(async () => {
    const state = await getPlanState();
    if (!state) return null;
    const runs = await db.runs.where('startedAt').aboveOrEqual(state.startedAt).toArray();
    return computePlanProgress(state, runs, today) ?? null;
  }, [today]);
}

export async function startRunPlan(planId: string, days: number[], startedAt: number): Promise<void> {
  await updateSetting('runPlan', { planId, days: [...days].sort(), startedAt, marks: [] });
}

export async function endRunPlan(): Promise<void> {
  await updateSetting('runPlan', null);
}

/** Mark today's session done (without a run in the app) or skipped */
export async function markPlanDay(day: number, kind: 'done' | 'skipped'): Promise<void> {
  const state = await getPlanState();
  if (!state) return;
  const marks = state.marks.filter((m) => m.date !== day);
  await updateSetting('runPlan', { ...state, marks: [...marks, { date: day, kind }] });
}

/** Undo a manual mark (a run's own credit can't be undone this way) */
export async function clearPlanMark(day: number): Promise<void> {
  const state = await getPlanState();
  if (!state) return;
  await updateSetting('runPlan', { ...state, marks: state.marks.filter((m) => m.date !== day) });
}
