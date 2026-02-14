import { useState, useEffect } from 'react';
import { db } from '../db';
import { getPreviousSets } from './useSets';
import {
  calculateOverloadSuggestion,
  DEFAULT_WEIGHT_INCREMENT,
  type OverloadSuggestion,
} from '../utils/overload';
import type { TemplateExercise } from '../types';

/**
 * Hook to get progressive overload suggestion for an exercise
 * 
 * @param exerciseId - The exercise to get suggestion for
 * @param templateExercise - Optional template exercise with targets (if started from template)
 */
export function useProgressiveOverload(
  exerciseId: string,
  templateExercise?: TemplateExercise
): {
  suggestion: OverloadSuggestion | null;
  isLoading: boolean;
} {
  const [suggestion, setSuggestion] = useState<OverloadSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSuggestion() {
      setIsLoading(true);

      try {
        // Get previous session's sets
        const previousSets = await getPreviousSets(exerciseId);

        if (previousSets.length === 0) {
          setSuggestion({
            type: 'no_data',
            message: 'No previous data',
          });
          setIsLoading(false);
          return;
        }

        // Get weight increment from settings
        let weightIncrement = DEFAULT_WEIGHT_INCREMENT;
        const setting = await db.settings.get('weightIncrement');
        if (setting?.value && typeof setting.value === 'number') {
          weightIncrement = setting.value;
        }

        // Get target reps from template exercise
        const targetReps = templateExercise?.targetReps;

        // Calculate suggestion
        const result = calculateOverloadSuggestion(
          previousSets,
          targetReps,
          templateExercise?.weight,
          weightIncrement
        );

        setSuggestion(result);
      } catch (error) {
        console.error('Failed to load overload suggestion:', error);
        setSuggestion(null);
      }

      setIsLoading(false);
    }

    loadSuggestion();
  }, [exerciseId, templateExercise?.sets, templateExercise?.weight]);

  return { suggestion, isLoading };
}

/**
 * Get template exercise defaults if the session was started from a template
 */
export async function getTemplateExerciseDefaults(
  sessionId: string,
  exerciseId: string
): Promise<TemplateExercise | undefined> {
  // Get the session to find templateId
  const session = await db.sessions.get(sessionId);
  if (!session?.templateId) return undefined;

  // Get the template
  const template = await db.templates.get(session.templateId);
  if (!template) return undefined;

  // Find the exercise in the template
  return template.exercises.find((e) => e.exerciseId === exerciseId);
}
