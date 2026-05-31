/**
 * Workout status types
 * v1.4: Added for routine-centric workflow
 */
export type SessionStatus = 'completed' | 'skipped' | 'sick';

/**
 * Session entity - a logged workout
 * v1.1: Added templateId to track which template was used
 * v1.4: Added status field for workout statuses
 */
export interface Session {
  id: string;
  routineId?: string; // Which routine this was from (null if manual)
  templateId?: string; // Which template was used
  status?: SessionStatus; // v1.4: completed, skipped, or sick
  startedAt: number;
  completedAt?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * SessionExercise entity - join table between session and exercise
 */
export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string; // Always the concrete exercise used
  progressionId?: string; // Tracks that this came from a progression slot
  order: number;
  groupId?: string;
  groupType?: 'superset' | 'circuit';
  groupOrder?: number;
  notes?: string;
  createdAt: number;
}
