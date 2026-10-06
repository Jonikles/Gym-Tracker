import {
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useActiveSession,
  useSessionExercises,
  startBlankSession,
  completeSession,
  abandonSession,
  addExerciseToSession,
  removeExerciseFromSession,
  reorderSessionExercises,
  importTemplateIntoSession,
  switchProgressionLevel as switchProgressionLevelFn,
  switchExerciseVariant as switchExerciseVariantFn,
  groupSessionExercises,
  ungroupAllSessionExercises,
} from '../hooks/useSessions';
import type { SessionExercise, Exercise } from '../types';
import { SessionContext, type SessionContextValue } from './useSessionContext';

/** Stable empty array so the memoized context value doesn't change while loading */
const EMPTY_SESSION_EXERCISES: SessionExercise[] = [];

export function SessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const activeSession = useActiveSession();
  const liveSessionExercises = useSessionExercises(activeSession?.id);
  const sessionExercises = liveSessionExercises ?? EMPTY_SESSION_EXERCISES;
  const [isLoading, setIsLoading] = useState(false);

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

  const switchProgression = useCallback(async (sessionExerciseId: string, newExerciseId: string) => {
    if (!activeSession) return undefined;
    return switchProgressionLevelFn(activeSession.id, sessionExerciseId, newExerciseId);
  }, [activeSession]);

  const switchVariant = useCallback(async (sessionExerciseId: string, newExerciseId: string) => {
    await switchExerciseVariantFn(sessionExerciseId, newExerciseId);
  }, []);

  const groupExercises = useCallback(async (sessionExerciseIds: string[], groupType: 'superset' | 'circuit') => {
    await groupSessionExercises(sessionExerciseIds, groupType);
  }, []);

  const ungroupAll = useCallback(async (groupId: string) => {
    if (!activeSession) return;
    await ungroupAllSessionExercises(activeSession.id, groupId);
  }, [activeSession]);

  const value = useMemo<SessionContextValue>(
    () => ({
      activeSession,
      sessionExercises,
      isLoading,
      startBlank,
      complete,
      abandon,
      importTemplate,
      addExercise,
      removeExercise,
      reorderExercises,
      switchProgressionLevel: switchProgression,
      switchExerciseVariant: switchVariant,
      groupExercises,
      ungroupAll,
    }),
    [
      activeSession,
      sessionExercises,
      isLoading,
      startBlank,
      complete,
      abandon,
      importTemplate,
      addExercise,
      removeExercise,
      reorderExercises,
      switchProgression,
      switchVariant,
      groupExercises,
      ungroupAll,
    ]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}
