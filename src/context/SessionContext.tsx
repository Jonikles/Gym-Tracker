import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useActiveSession,
  useSessionExercises,
  startSessionFromRoutine,
  startBlankSession,
  completeSession,
  abandonSession,
  addExerciseToSession,
  removeExerciseFromSession,
  reorderSessionExercises,
  importTemplateIntoSession,
} from '../hooks/useSessions';
import type { Session, SessionExercise, Exercise } from '../types';

interface SessionContextValue {
  // Current active session
  activeSession: Session | undefined;
  sessionExercises: SessionExercise[];
  isLoading: boolean;

  // Session actions
  startFromRoutine: (routineId: string) => Promise<void>;
  startBlank: () => Promise<void>;
  complete: () => Promise<void>;
  abandon: () => Promise<void>;
  importTemplate: (templateId: string) => Promise<void>;

  // Exercise actions
  addExercise: (exercise: Exercise) => Promise<void>;
  removeExercise: (sessionExerciseId: string) => Promise<void>;
  reorderExercises: (exerciseIds: string[]) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const activeSession = useActiveSession();
  const sessionExercises = useSessionExercises(activeSession?.id) ?? [];
  const [isLoading, setIsLoading] = useState(false);

  const startFromRoutine = useCallback(async (routineId: string) => {
    setIsLoading(true);
    try {
      await startSessionFromRoutine(routineId);
      navigate('/workout');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const startBlank = useCallback(async () => {
    setIsLoading(true);
    try {
      await startBlankSession();
      navigate('/workout');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const complete = useCallback(async () => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      await completeSession(activeSession.id);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  }, [activeSession, navigate]);

  const abandon = useCallback(async () => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      await abandonSession(activeSession.id);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  }, [activeSession, navigate]);

  const importTemplate = useCallback(async (templateId: string) => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      await importTemplateIntoSession(activeSession.id, templateId);
    } finally {
      setIsLoading(false);
    }
  }, [activeSession]);

  const addExercise = useCallback(async (exercise: Exercise) => {
    if (!activeSession) return;
    await addExerciseToSession(activeSession.id, exercise.id);
  }, [activeSession]);

  const removeExercise = useCallback(async (sessionExerciseId: string) => {
    await removeExerciseFromSession(sessionExerciseId);
  }, []);

  const reorderExercises = useCallback(async (exerciseIds: string[]) => {
    if (!activeSession) return;
    await reorderSessionExercises(activeSession.id, exerciseIds);
  }, [activeSession]);

  return (
    <SessionContext.Provider
      value={{
        activeSession,
        sessionExercises,
        isLoading,
        startFromRoutine,
        startBlank,
        complete,
        abandon,
        importTemplate,
        addExercise,
        removeExercise,
        reorderExercises,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}
