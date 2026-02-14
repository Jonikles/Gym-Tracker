import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common';
import { getRoutineCalendar, type CalendarDay, type CalendarDayStatus } from '../../utils/calendar';
import type { Routine } from '../../types';
import styles from './RoutineCalendar.module.css';

interface RoutineCalendarProps {
  routine: Routine;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getStatusIcon(status: CalendarDayStatus): string {
  switch (status) {
    case 'completed': return '✓';
    case 'skipped': return '⊘';
    case 'sick': return '+';
    case 'rest': return '—';
    case 'pending': return '•';
    default: return '';
  }
}

function getStatusClass(status: CalendarDayStatus): string {
  switch (status) {
    case 'completed': return styles.completed;
    case 'skipped': return styles.skipped;
    case 'sick': return styles.sick;
    case 'rest': return styles.rest;
    case 'pending': return styles.pending;
    default: return '';
  }
}

export function RoutineCalendar({ routine }: RoutineCalendarProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    let cancelled = false;

    async function loadCalendar() {
      setIsLoading(true);
      try {
        const days = await getRoutineCalendar(routine, year, month);
        if (!cancelled) {
          setCalendarDays(days);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadCalendar();

    return () => {
      cancelled = true;
    };
  }, [routine, year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.sessionId && day.status === 'completed') {
      navigate(`/history/${day.sessionId}`);
    }
  };

  // Calculate starting day offset for the month
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Build calendar grid
  const calendarGrid: (CalendarDay | null)[] = [];

  // Add empty days for offset
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarGrid.push(null);
  }

  // Add actual days
  calendarGrid.push(...calendarDays);

  // Fill remaining to complete weeks
  while (calendarGrid.length % 7 !== 0) {
    calendarGrid.push(null);
  }

  const today = new Date();
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
          ←
        </Button>
        <h3 className={styles.monthTitle}>
          {MONTH_NAMES[month]} {year}
        </h3>
        <Button variant="ghost" size="sm" onClick={handleNextMonth}>
          →
        </Button>
      </div>

      <div className={styles.weekHeader}>
        {DAY_LETTERS.map((letter, i) => (
          <div key={i} className={styles.weekDay}>
            {letter}
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
          calendarGrid.map((day, index) => (
            <div
              key={index}
              className={`${styles.day} ${day ? getStatusClass(day.status) : styles.empty} ${
                day && isToday(day.date) ? styles.today : ''
              } ${day?.sessionId && day?.status === 'completed' ? styles.clickable : ''}`}
              onClick={() => day && handleDayClick(day)}
              title={day ? `${day.templateName ?? 'Rest'} - ${day.status}` : ''}
            >
              {day && (
                <>
                  <span className={styles.dayNumber}>{day.date.getDate()}</span>
                  <span className={styles.statusIcon}>{getStatusIcon(day.status)}</span>
                  {day.templateName && (
                    <span className={styles.templateName}>
                      {day.templateName.slice(0, 4)}
                    </span>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.completed}`}>✓</span>
          <span>Completed</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.skipped}`}>⊘</span>
          <span>Skipped</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.sick}`}>+</span>
          <span>Sick</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.pending}`}>•</span>
          <span>Pending</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.rest}`}>—</span>
          <span>Rest</span>
        </div>
      </div>
    </div>
  );
}
