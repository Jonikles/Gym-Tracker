import type { ExerciseField, Set } from '../../types';

/** True when any of the exercise's required fields is missing on this set */
export function setHasEmptyRequiredField(set: Set, fields: ExerciseField[]): boolean {
  return fields.some((field) => set[field] === undefined || set[field] === null);
}

/** Group sets by their sessionExerciseId (single pass) */
export function groupSetsBySessionExercise(sets: Set[]): Map<string, Set[]> {
  const map = new Map<string, Set[]>();
  for (const s of sets) {
    const list = map.get(s.sessionExerciseId);
    if (list) list.push(s);
    else map.set(s.sessionExerciseId, [s]);
  }
  return map;
}
