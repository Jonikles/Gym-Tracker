import { useMemo, useState } from 'react';
import type { Session } from '../../types';
import styles from './CalendarView.module.css';

interface CalendarViewProps {
  sessions: Session[];
  onDayClick: (date: string, sessions: Session[]) => void;
  sessionPRCounts?: Map<string, number>;
  weekStartDay?: number; // 0=Sun .. 6=Sat
}

const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({ sessions, onDayClick, sessionPRCounts, weekStartDay = 0 }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Build a map of day → sessions for the current month
  const dayMap = useMemo(() => {
    const map = new Map<number, Session[]>();
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        const existing = map.get(day) ?? [];
        existing.push(s);
        map.set(day, existing);
      }
    }
    return map;
  }, [sessions, year, month]);

  // Day headers respecting weekStartDay
  const dayHeaders = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ALL_DAYS[(weekStartDay + i) % 7]),
    [weekStartDay]
  );

  // Calendar grid
  const firstDayRaw = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = (firstDayRaw - weekStartDay + 7) % 7; // how many blank cells before day 1
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const monthLabel = currentMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={styles.calendar}>
      <div className={styles.calendarNav}>
        <button className={styles.navBtn} onClick={prevMonth}>&#8592;</button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button className={styles.navBtn} onClick={nextMonth}>&#8594;</button>
      </div>
      <div className={styles.calendarGrid}>
        {dayHeaders.map((d, i) => (
          <div key={`${d}-${i}`} className={styles.dayHeader}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className={styles.emptyCell} />;
          const daySessions = dayMap.get(day) ?? [];
          const hasSessions = daySessions.length > 0;
          const hasPRs = daySessions.some((s) => (sessionPRCounts?.get(s.id) ?? 0) > 0);
          const isToday = isCurrentMonth && day === todayDate;

          return (
            <button
              key={day}
              className={`${styles.dayCell} ${hasSessions ? styles.hasSession : ''} ${isToday ? styles.today : ''}`}
              onClick={() => {
                if (!hasSessions) return;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                onDayClick(dateStr, daySessions);
              }}
              disabled={!hasSessions}
            >
              <span className={styles.dayNumber}>{day}</span>
              {hasSessions && (
                <div className={styles.dayDots}>
                  {daySessions.length > 1 && (
                    <span className={styles.sessionCount}>{daySessions.length}</span>
                  )}
                  <span className={styles.dot} />
                  {hasPRs && <span className={styles.prDot} />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
