import { db } from '../db';
import type { Routine } from '../types';

/**
 * Calendar day status types
 * v1.4: For routine-centric calendar view
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
 * Get the start of a day (midnight)
 */
export function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Get days in a month
 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/**
 * Calculate calendar days for a fixed routine
 * Maps day of week to template
 */
export async function getFixedRoutineCalendar(
  routine: Routine,
  year: number,
  month: number
): Promise<CalendarDay[]> {
  const days = getDaysInMonth(year, month);
  const result: CalendarDay[] = [];

  // Get all sessions for this routine in this month
  const startOfMonth = new Date(year, month, 1).getTime();
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

  const sessions = await db.sessions
    .filter(
      (s) =>
        s.routineId === routine.id &&
        s.startedAt >= startOfMonth &&
        s.startedAt <= endOfMonth
    )
    .toArray();

  // Get all templates for lookup
  const templateIds = routine.schedule
    .map((d) => d.templateId)
    .filter((id): id is string => !!id);
  const templates = await db.templates.bulkGet(templateIds);
  const templateMap = new Map(templates.filter(Boolean).map((t) => [t!.id, t!]));

  for (const date of days) {
    const dayOfWeek = date.getDay();
    const scheduleDay = routine.schedule.find((d) => d.dayIndex === dayOfWeek);
    const templateId = scheduleDay?.templateId ?? null;
    const template = templateId ? templateMap.get(templateId) : null;

    // Find session for this day
    const dayStart = getStartOfDay(date).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const session = sessions.find(
      (s) => s.startedAt >= dayStart && s.startedAt < dayEnd
    );

    let status: CalendarDayStatus;
    if (!templateId) {
      status = 'rest';
    } else if (session) {
      // Only treat as completed if status is explicitly set or session has completedAt
      status = session.status ?? (session.completedAt ? 'completed' : 'pending');
    } else if (date < getStartOfDay(new Date())) {
      // Past day with no session - mark as pending (missed)
      status = 'pending';
    } else {
      status = 'pending';
    }

    result.push({
      date,
      templateId,
      templateName: template?.name ?? null,
      sessionId: session?.id ?? null,
      status,
    });
  }

  return result;
}

/**
 * Calculate calendar days for a rolling routine
 * Uses first workout date or routine creation as anchor
 */
export async function getRollingRoutineCalendar(
  routine: Routine,
  year: number,
  month: number
): Promise<CalendarDay[]> {
  const days = getDaysInMonth(year, month);
  const result: CalendarDay[] = [];

  // Get all sessions for this routine
  const allSessions = await db.sessions
    .filter((s) => s.routineId === routine.id && s.completedAt != null)
    .toArray();

  // Sort by start date to find anchor
  allSessions.sort((a, b) => a.startedAt - b.startedAt);

  // Get anchor date (first workout or routine creation)
  const anchorDate = allSessions.length > 0
    ? getStartOfDay(new Date(allSessions[0].startedAt))
    : getStartOfDay(new Date(routine.createdAt));

  // Get all templates for lookup
  const templateIds = routine.schedule
    .map((d) => d.templateId)
    .filter((id): id is string => !!id);
  const templates = await db.templates.bulkGet(templateIds);
  const templateMap = new Map(templates.filter(Boolean).map((t) => [t!.id, t!]));

  // Get sessions for this month
  const startOfMonth = new Date(year, month, 1).getTime();
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  const monthSessions = allSessions.filter(
    (s) => s.startedAt >= startOfMonth && s.startedAt <= endOfMonth
  );

  for (const date of days) {
    // Calculate which position in the rolling schedule this date would be
    const daysSinceAnchor = Math.floor(
      (getStartOfDay(date).getTime() - anchorDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    // For rolling routines, we cycle through the schedule
    const scheduleLength = routine.schedule.length;
    let position = daysSinceAnchor % scheduleLength;
    if (position < 0) position += scheduleLength; // Handle dates before anchor

    const scheduleDay = routine.schedule[position];
    const templateId = scheduleDay?.templateId ?? null;
    const template = templateId ? templateMap.get(templateId) : null;

    // Find session for this day
    const dayStart = getStartOfDay(date).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const session = monthSessions.find(
      (s) => s.startedAt >= dayStart && s.startedAt < dayEnd
    );

    let status: CalendarDayStatus;
    if (!templateId) {
      status = 'rest';
    } else if (session) {
      status = session.status ?? (session.completedAt ? 'completed' : 'pending');
    } else if (date < getStartOfDay(new Date())) {
      status = 'pending';
    } else {
      status = 'pending';
    }

    result.push({
      date,
      templateId,
      templateName: template?.name ?? null,
      sessionId: session?.id ?? null,
      status,
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
