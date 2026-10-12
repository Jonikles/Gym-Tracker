/**
 * Task - Action items to remember, optionally linked to exercises/sessions
 */
export interface Task {
  id: string;
  text: string;
  sessionId?: string;       // Session where this was created (context)
  exerciseId?: string;      // Related exercise (context)
  dueExerciseId?: string;   // Show reminder when next doing this exercise
  isCompleted: boolean;
  createdAt: number;
  completedAt?: number;
}
