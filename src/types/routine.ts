/**
 * Routine type - fixed (assigned to weekdays) or rolling (cycle through)
 */
export type RoutineType = 'fixed' | 'rolling';

/**
 * A single day in a routine schedule
 */
export interface RoutineDay {
  dayIndex: number; // 0-6 for fixed (Sun-Sat), 0-N for rolling
  templateId?: string; // Reference to template (undefined = rest day)
  label?: string; // Optional label (e.g., "Push", "Pull", "Rest")
}

/**
 * Routine entity - a weekly schedule that assigns templates to days
 */
export interface Routine {
  id: string;
  name: string;
  type: RoutineType;
  schedule: RoutineDay[]; // 7 slots for fixed, N slots for rolling
  currentPosition?: number; // For rolling: which day is next (0-indexed)
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}
