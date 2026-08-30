import { db } from '../db';
import type { RoutineDay, Session } from '../types';

/** Get the start of a day (midnight) for a timestamp in local time */
function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Auto-skip scheduled workout days that passed with nothing logged.
 *
 * Runs on every app startup. For the active routine, walks day-by-day from the
 * last check (or from when the routine became active, whichever is later) up to
 * yesterday. Any scheduled day (has a templateId, i.e. not a rest day) with no
 * session at all gets a synthetic session with status 'skipped' — same as if the
 * user had tapped "Skip" on the Home page for that day. Today is left alone so
 * the user can still act on it manually.
 *
 * Never backfills before the routine was set active, and never runs if no
 * routine is active. The whole check runs inside one readwrite transaction so
 * concurrent calls (e.g. React StrictMode's double-invoked effects, or multiple
 * tabs open at once) serialize instead of racing to insert duplicate sessions.
 */
export async function autoSkipMissedWorkouts(): Promise<void> {
  await db.transaction('rw', [db.sessions, db.routines, db.settings], async () => {
    const activeRoutineIdSetting = await db.settings.get('activeRoutineId');
    const activeRoutineId = activeRoutineIdSetting?.value as string | null | undefined;
    const todayStart = startOfDay(Date.now());

    if (!activeRoutineId) {
      // No active routine — nothing to check, but keep the checkpoint current so
      // a routine activated later doesn't trigger a backfill through this gap.
      await db.settings.put({ key: 'lastAutoSkipCheckAt', value: todayStart, updatedAt: Date.now() });
      return;
    }

    const routine = await db.routines.get(activeRoutineId);
    if (!routine) {
      await db.settings.put({ key: 'lastAutoSkipCheckAt', value: todayStart, updatedAt: Date.now() });
      return;
    }

    const lastCheckSetting = await db.settings.get('lastAutoSkipCheckAt');
    const activeSetAtSetting = await db.settings.get('activeRoutineSetAt');
    const activeSetAt = activeSetAtSetting?.value as number | null | undefined;

    // Never check further back than when this routine became active
    const earliestCheckDay = activeSetAt != null ? startOfDay(activeSetAt) : todayStart;
    const lastCheckDay = lastCheckSetting?.value as number | null | undefined;
    const checkFrom = Math.max(lastCheckDay ?? earliestCheckDay, earliestCheckDay);

    if (checkFrom >= todayStart) {
      // Already checked through yesterday (or routine just became active today).
      // If this is the very first run, still establish the checkpoint — otherwise
      // it would never bootstrap and auto-skip would silently never activate.
      if (lastCheckDay == null) {
        await db.settings.put({ key: 'lastAutoSkipCheckAt', value: earliestCheckDay, updatedAt: Date.now() });
      }
      return;
    }

    let currentPosition = routine.currentPosition ?? 0;
    const scheduleLength = routine.schedule.length;
    let positionChanged = false;

    for (let dayStart = checkFrom; dayStart < todayStart; dayStart += DAY_MS) {
      let scheduleDay: RoutineDay | undefined;

      if (routine.type === 'fixed') {
        const dayIndex = new Date(dayStart).getDay();
        scheduleDay = routine.schedule.find((d) => d.dayIndex === dayIndex);
      } else if (scheduleLength > 0) {
        scheduleDay = routine.schedule[currentPosition % scheduleLength];
      }

      if (scheduleDay?.templateId) {
        const dayEnd = dayStart + DAY_MS;
        const hasSessionThatDay = await db.sessions
          .where('startedAt')
          .between(dayStart, dayEnd, true, false)
          .first();

        if (!hasSessionThatDay) {
          const skipTime = dayStart + 12 * 60 * 60 * 1000; // noon that day
          const skippedSession: Session = {
            id: crypto.randomUUID(),
            routineId: routine.id,
            templateId: scheduleDay.templateId,
            status: 'skipped',
            startedAt: skipTime,
            completedAt: skipTime,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await db.sessions.add(skippedSession);
        }
      }

      if (routine.type === 'rolling' && scheduleLength > 0) {
        currentPosition = (currentPosition + 1) % scheduleLength;
        positionChanged = true;
      }
    }

    if (positionChanged) {
      await db.routines.update(routine.id, { currentPosition, updatedAt: Date.now() });
    }

    await db.settings.put({ key: 'lastAutoSkipCheckAt', value: todayStart, updatedAt: Date.now() });
  });
}
