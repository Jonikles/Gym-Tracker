/**
 * PR types that can be tracked
 */
export type PRType = 'weight' | 'reps' | 'e1rm' | 'progression';

/**
 * PR entity - personal record history
 */
export interface PR {
  id: string;
  exerciseId: string;
  setId: string;
  type: PRType;
  value: number;
  previousValue?: number;
  progressionId?: string;
  achievedAt: number;
  createdAt: number;
}
