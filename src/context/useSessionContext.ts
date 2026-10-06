import { createContext, useContext } from 'react';
import type { Session, SessionExercise, Exercise } from '../types';

export interface SessionContextValue {
  // Current active session
  activeSession: Session | undefined;
  sessionExercises: SessionExercise[];
  isLoading: boolean;

  // Session actions
  startBlank: () => Promise<void>;
  complete: () => Promise<void>;
  abandon: () => Promise<void>;
  importTemplate: (templateId: string) => Promise<void>;

  // Exercise actions
  addExercise: (exercise: Exercise) => Promise<void>;
  removeExercise: (sessionExerciseId: string) => Promise<void>;
  reorderExercises: (exerciseIds: string[]) => Promise<void>;
  switchProgressionLevel: (sessionExerciseId: string, newExerciseId: string) => Promise<string | undefined>;
  /** Swap a family exercise to another variant (e.g. Incline Dumbbell Bench Press); keeps its sets */
  switchExerciseVariant: (sessionExerciseId: string, newExerciseId: string) => Promise<void>;

  // Grouping actions (superset/circuit)
  groupExercises: (sessionExerciseIds: string[], groupType: 'superset' | 'circuit') => Promise<void>;
  ungroupAll: (groupId: string) => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}
