import type { Routine } from '../../types';
import { Card } from '../common';
import styles from './RoutineCard.module.css';

interface RoutineCardProps {
  routine: Routine;
  onClick?: () => void;
  /** templateId → name, batch-fetched by the parent list */
  templateNames?: Map<string, string>;
  /** The user's current routine — gets an "Active" chip and accent glow */
  isActive?: boolean;
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RoutineCard({ routine, onClick, templateNames, isActive }: RoutineCardProps) {
  const activeDays = routine.schedule.filter((s) => s.templateId);
  const restDays = routine.schedule.filter((s) => !s.templateId);

  // For rolling routines, show current position
  const isCurrentDay = routine.type === 'rolling' && routine.currentPosition !== undefined;
  const currentDayLabel = isCurrentDay
    ? routine.schedule[routine.currentPosition!]?.label
    : undefined;

  return (
    <Card
      onClick={onClick}
      interactive={!!onClick}
      className={`${styles.card} ${isActive ? styles.activeCard : ''}`}
    >
      <div className={styles.header}>
        <h3 className={styles.name}>{routine.name}</h3>
        {isActive && <span className="chip chip-accent">Active</span>}
      </div>
      <div className={styles.details}>
        <span className={styles.count}>
          <span className={`num ${styles.countValue}`}>{activeDays.length}</span> workout{activeDays.length !== 1 ? 's' : ''}
          {restDays.length > 0 && (
            <>
              {' · '}
              <span className={`num ${styles.countValue}`}>{restDays.length}</span> rest
            </>
          )}
        </span>
        {routine.type === 'fixed' && (
          <div className={styles.schedule}>
            {routine.schedule.map((day) => (
              <span
                key={day.dayIndex}
                className={`${styles.dayDot} ${day.templateId ? styles.active : styles.rest}`}
                title={
                  day.templateId
                    ? templateNames?.get(day.templateId) ?? day.label
                    : 'Rest'
                }
              >
                {DAY_NAMES_SHORT[day.dayIndex]?.charAt(0)}
              </span>
            ))}
          </div>
        )}
        {routine.type === 'rolling' && (
          <span className={`chip chip-accent ${styles.next}`}>
            Next: {currentDayLabel || `Day ${(routine.currentPosition ?? 0) + 1}`}
          </span>
        )}
      </div>
    </Card>
  );
}
