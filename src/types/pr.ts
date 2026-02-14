/**
 * PR types that can be tracked
 */
export type PRType = 'weight' | 'reps' | 'e1rm';

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
  achievedAt: number;
  createdAt: number;
}
