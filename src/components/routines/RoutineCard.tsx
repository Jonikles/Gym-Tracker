import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Routine } from '../../types';
import { Card } from '../common';
import styles from './RoutineCard.module.css';

interface RoutineCardProps {
  routine: Routine;
  onClick?: () => void;
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RoutineCard({ routine, onClick }: RoutineCardProps) {
  // Get template names for display
  const templateIds = routine.schedule
    .map((s) => s.templateId)
    .filter((id): id is string => !!id);

  const templates = useLiveQuery(
    async () => {
      if (templateIds.length === 0) return [];
      const results = await Promise.all(
        templateIds.map((id) => db.templates.get(id))
      );
      return results.filter((t) => t !== undefined);
    },
    [templateIds.join(',')]
  );

  const activeDays = routine.schedule.filter((s) => s.templateId);
  const restDays = routine.schedule.filter((s) => !s.templateId);

  // For rolling routines, show current position
  const isCurrentDay = routine.type === 'rolling' && routine.currentPosition !== undefined;
  const currentDayLabel = isCurrentDay
    ? routine.schedule[routine.currentPosition!]?.label
    : undefined;

  return (
    <Card onClick={onClick} interactive={!!onClick}>
      <div className={styles.header}>
        <h3 className={styles.name}>{routine.name}</h3>
      </div>
      <div className={styles.details}>
        <span className={styles.count}>
          {activeDays.length} workout{activeDays.length !== 1 ? 's' : ''}
          {restDays.length > 0 && `, ${restDays.length} rest`}
        </span>
        {routine.type === 'fixed' && (
          <div className={styles.schedule}>
            {routine.schedule.map((day) => (
              <span
                key={day.dayIndex}
                className={`${styles.dayDot} ${day.templateId ? styles.active : styles.rest}`}
                title={
                  day.templateId
                    ? templates?.find((t) => t?.id === day.templateId)?.name ?? day.label
                    : 'Rest'
                }
              >
                {DAY_NAMES_SHORT[day.dayIndex]?.charAt(0)}
              </span>
            ))}
          </div>
        )}
        {routine.type === 'rolling' && (
          <span className={styles.next}>
            Next: {currentDayLabel || `Day ${(routine.currentPosition ?? 0) + 1}`}
          </span>
        )}
      </div>
    </Card>
  );
}
