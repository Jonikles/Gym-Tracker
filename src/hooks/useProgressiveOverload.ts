import { useState, useEffect } from 'react';
import { db } from '../db';
import { getPreviousSets } from './useSets';
import {
  calculateOverloadSuggestion,
  DEFAULT_WEIGHT_INCREMENT,
  type OverloadSuggestion,
} from '../utils/overload';
import type { TemplateExercise, ExerciseField } from '../types';

/**
 * Hook to get progressive overload suggestion for an exercise
 *
 * @param exerciseId - The exercise to get suggestion for
 * @param templateExercise - Optional template exercise with targets (if started from template)
 * @param defaultFields - The exercise's field configuration (weight, reps, time, distance)
 */
/** Module-level default so callers omitting defaultFields don't get a new array (and a re-run) every render */
const DEFAULT_FIELDS: ExerciseField[] = ['weight', 'reps'];

export function useProgressiveOverload(
  exerciseId: string,
  templateExercise?: TemplateExercise,
  defaultFields: ExerciseField[] = DEFAULT_FIELDS
): {
  suggestion: OverloadSuggestion | null;
  isLoading: boolean;
} {
  const [suggestion, setSuggestion] = useState<OverloadSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const targetReps = templateExercise?.targetReps;
  const targetWeight = templateExercise?.weight;
  // Compare fields by value so a caller passing a fresh-but-equal array doesn't re-trigger
  const fieldsKey = defaultFields.join(',');

  useEffect(() => {
    let cancelled = false;
    const fields = fieldsKey ? (fieldsKey.split(',') as ExerciseField[]) : [];

    async function loadSuggestion() {
      setIsLoading(true);

      try {
        // Get previous session's sets
        const previousSets = await getPreviousSets(exerciseId);
        if (cancelled) return;

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
        if (cancelled) return;
        if (setting?.value && typeof setting.value === 'number') {
          weightIncrement = setting.value;
        }

        // Calculate suggestion
        const result = calculateOverloadSuggestion(
          previousSets,
          targetReps,
          targetWeight,
          weightIncrement,
          fields
        );

        setSuggestion(result);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load overload suggestion:', error);
        setSuggestion(null);
      }

      setIsLoading(false);
    }

    loadSuggestion();
    return () => {
      cancelled = true;
    };
  }, [exerciseId, targetReps, targetWeight, fieldsKey]);

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
