import { db } from '../db';
import type { Routine, Session } from '../types';
import { startOfLocalDay, startOfNextLocalDay } from './session';

/**
 * Calendar day status types for the routine calendar view
 */
export type CalendarDayStatus = 'pending' | 'completed' | 'skipped' | 'sick' | 'rest';

/**
 * Calendar day data structure
 */
export interface CalendarDay {
  date: Date;
  templateId: string | null;
  templateName: string | null;
  sessionId: string | null;
  status: CalendarDayStatus;
}

/**
 * Whole calendar days from a to b in local time. Rounded so the 23/25-hour
 * days around DST transitions don't shift the result by one.
 */
function calendarDaysBetween(a: Date, b: Date): number {
  return Math.round((startOfLocalDay(b.getTime()) - startOfLocalDay(a.getTime())) / (24 * 60 * 60 * 1000));
}

/**
 * Get days in a month
 */
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/** Status for a calendar day given its scheduled template and the session that day */
function getDayStatus(templateId: string | null, session: Session | undefined): CalendarDayStatus {
  if (!templateId) return 'rest';
  // Only treat as completed if status is explicitly set or session has completedAt.
  // No session (past or future) shows as pending.
  if (session) return session.status ?? (session.completedAt ? 'completed' : 'pending');
  return 'pending';
}

/** Find the session (if any) that started on the given local day */
function findSessionOnDay(sessions: Session[], date: Date): Session | undefined {
  const dayStart = startOfLocalDay(date.getTime());
  const dayEnd = startOfNextLocalDay(date.getTime());
  return sessions.find((s) => s.startedAt >= dayStart && s.startedAt < dayEnd);
}

async function getTemplateMap(routine: Routine) {
  const templateIds = routine.schedule
    .map((d) => d.templateId)
    .filter((id): id is string => !!id);
  const templates = await db.templates.bulkGet(templateIds);
  return new Map(templates.filter(Boolean).map((t) => [t!.id, t!]));
}

/**
 * Calculate calendar days for a fixed routine
 * Maps day of week to template
 */
async function getFixedRoutineCalendar(
  routine: Routine,
  year: number,
  month: number
): Promise<CalendarDay[]> {
  const days = getDaysInMonth(year, month);
  const result: CalendarDay[] = [];

  // Get all sessions for this routine in this month (indexed range query)
  const startOfMonth = new Date(year, month, 1).getTime();
  const startOfNextMonth = new Date(year, month + 1, 1).getTime();

  const sessions = await db.sessions
    .where('startedAt')
    .between(startOfMonth, startOfNextMonth, true, false)
    .filter((s) => s.routineId === routine.id)
    .toArray();

  const templateMap = await getTemplateMap(routine);

  for (const date of days) {
    const dayOfWeek = date.getDay();
    const scheduleDay = routine.schedule.find((d) => d.dayIndex === dayOfWeek);
    const templateId = scheduleDay?.templateId ?? null;
    const template = templateId ? templateMap.get(templateId) : null;
    const session = findSessionOnDay(sessions, date);

    result.push({
      date,
      templateId,
      templateName: template?.name ?? null,
      sessionId: session?.id ?? null,
      status: getDayStatus(templateId, session),
    });
  }

  return result;
}

/**
 * Calculate calendar days for a rolling routine
 * Uses first workout date or routine creation as anchor
 */
async function getRollingRoutineCalendar(
  routine: Routine,
  year: number,
  month: number
): Promise<CalendarDay[]> {
  const days = getDaysInMonth(year, month);
  const result: CalendarDay[] = [];

  // Get all completed sessions for this routine (indexed by routineId)
  const allSessions = await db.sessions
    .where('routineId')
    .equals(routine.id)
    .filter((s) => s.completedAt != null)
    .toArray();

  // Sort by start date to find anchor
  allSessions.sort((a, b) => a.startedAt - b.startedAt);

  // Get anchor date (first workout or routine creation)
  const anchorDate = allSessions.length > 0
    ? new Date(startOfLocalDay(allSessions[0].startedAt))
    : new Date(startOfLocalDay(routine.createdAt));

  const templateMap = await getTemplateMap(routine);

  // Get sessions for this month
  const startOfMonth = new Date(year, month, 1).getTime();
  const startOfNextMonth = new Date(year, month + 1, 1).getTime();
  const monthSessions = allSessions.filter(
    (s) => s.startedAt >= startOfMonth && s.startedAt < startOfNextMonth
  );

  const scheduleLength = routine.schedule.length;

  for (const date of days) {
    // Calculate which position in the rolling schedule this date would be
    const daysSinceAnchor = calendarDaysBetween(anchorDate, date);

    // For rolling routines, we cycle through the schedule
    let position = scheduleLength > 0 ? daysSinceAnchor % scheduleLength : 0;
    if (position < 0) position += scheduleLength; // Handle dates before anchor

    const scheduleDay = routine.schedule[position];
    const templateId = scheduleDay?.templateId ?? null;
    const template = templateId ? templateMap.get(templateId) : null;
    const session = findSessionOnDay(monthSessions, date);

    result.push({
      date,
      templateId,
      templateName: template?.name ?? null,
      sessionId: session?.id ?? null,
      status: getDayStatus(templateId, session),
    });
  }

  return result;
}

/**
 * Get calendar data for a routine
 */
export async function getRoutineCalendar(
  routine: Routine,
  year: number,
  month: number
): Promise<CalendarDay[]> {
  if (routine.type === 'fixed') {
    return getFixedRoutineCalendar(routine, year, month);
  } else {
    return getRollingRoutineCalendar(routine, year, month);
  }
}
