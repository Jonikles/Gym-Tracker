/**
 * Calculate estimated 1RM using Epley formula
 * 
 * Formula: e1RM = weight × (1 + reps / 30)
 * 
 * Only reliable for reps ≤ 10
 */
export function calculateE1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

/**
 * Check if e1RM calculation is valid (reps ≤ 10)
 */
export function isE1RMValid(reps: number): boolean {
  return reps > 0 && reps <= 10;
}

