/**
 * DB-aware helpers for exercise families (see data/exercise-families.ts).
 *
 * Families are a UI grouping layer: every parameter combination is a concrete
 * exercise row (matched by name, case-insensitive), so history / PRs / previous
 * sets stay per concrete exercise.
 */
import { db } from '../db';
import {
  EXERCISE_FAMILIES,
  NEW_FAMILY_EXERCISES,
  findFamilyForExerciseName,
  isOptionAvailable,
  resolveVariant,
  type ExerciseFamily,
} from '../data/exercise-families';
import type { Exercise } from '../types';

export interface FamilyMembership {
  family: ExerciseFamily;
  params: Record<string, string>;
}

export interface FamilyIndex {
  /** Concrete exercise id → its family + params */
  byExerciseId: Map<string, FamilyMembership>;
  /** Family id → (paramsKey → concrete exercise) */
  variantsByFamily: Map<string, Map<string, Exercise>>;
}

/** Stable key for a params combination, in the family's dimension order */
function paramsKey(family: ExerciseFamily, params: Record<string, string>): string {
  return family.dimensions.map((d) => params[d.key] ?? '').join('|');
}

export function buildFamilyIndex(exercises: Exercise[]): FamilyIndex {
  const byExerciseId = new Map<string, FamilyMembership>();
  const variantsByFamily = new Map<string, Map<string, Exercise>>();
  for (const ex of exercises) {
    const hit = findFamilyForExerciseName(ex.name);
    if (!hit) continue;
    byExerciseId.set(ex.id, hit);
    let variants = variantsByFamily.get(hit.family.id);
    if (!variants) {
      variants = new Map();
      variantsByFamily.set(hit.family.id, variants);
    }
    const key = paramsKey(hit.family, hit.params);
    // Prefer presets if (unexpectedly) two rows share a name
    if (!variants.has(key) || (ex.isPreset && !variants.get(key)!.isPreset)) {
      variants.set(key, ex);
    }
  }
  return { byExerciseId, variantsByFamily };
}

/** The existing concrete exercise for a combination, if it's in the DB */
export function getVariantExercise(
  index: FamilyIndex,
  family: ExerciseFamily,
  params: Record<string, string>,
): Exercise | undefined {
  return index.variantsByFamily.get(family.id)?.get(paramsKey(family, params));
}

/** All concrete exercises of a family that exist in the DB */
function getFamilyMembers(index: FamilyIndex, family: ExerciseFamily): Exercise[] {
  const variants = index.variantsByFamily.get(family.id);
  return variants ? [...variants.values()] : [];
}

/**
 * Return the concrete exercise row for a family combination, creating it as a
 * preset if it's missing (deleted by the user, or not seeded yet).
 */
export async function getOrCreateVariantExercise(
  family: ExerciseFamily,
  params: Record<string, string>,
): Promise<Exercise | undefined> {
  const variant = resolveVariant(family, params);
  if (!variant) return undefined;
  const nameLower = variant.exerciseName.toLowerCase();

  return db.transaction('rw', db.exercises, async () => {
    const existing = await db.exercises.filter((e) => e.name.toLowerCase() === nameLower).first();
    if (existing) return existing;

    const now = Date.now();
    const def = NEW_FAMILY_EXERCISES.find((e) => e.name.toLowerCase() === nameLower);
    let base: Pick<Exercise, 'muscleGroups' | 'movementPattern' | 'equipment' | 'defaultFields'>;
    if (def) {
      base = {
        muscleGroups: def.muscleGroups,
        movementPattern: def.movementPattern,
        equipment: def.equipment,
        defaultFields: def.defaultFields,
      };
    } else {
      const defaultVariant = resolveVariant(family, family.defaults);
      const defaultName = defaultVariant?.exerciseName.toLowerCase();
      const template = defaultName
        ? await db.exercises.filter((e) => e.name.toLowerCase() === defaultName).first()
        : undefined;
      base = {
        muscleGroups: template?.muscleGroups,
        movementPattern: template?.movementPattern,
        equipment: template?.equipment,
        defaultFields: template?.defaultFields ?? ['weight', 'reps'],
      };
    }

    const created: Exercise = {
      id: crypto.randomUUID(),
      name: variant.exerciseName,
      ...base,
      isPreset: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.exercises.add(created);
    return created;
  });
}

/**
 * Apply a chip selection: set `dimKey = value`, then fix up any other dimension
 * whose current value no longer combines (switches to its first valid option).
 */
export function selectFamilyOption(
  family: ExerciseFamily,
  params: Record<string, string>,
  dimKey: string,
  value: string,
): Record<string, string> {
  const next = { ...params, [dimKey]: value };
  if (resolveVariant(family, next)) return next;

  // Re-resolve the other dimensions in order, each against what's fixed so far
  const fixed: Record<string, string> = { [dimKey]: value };
  for (const d of family.dimensions) {
    if (d.key === dimKey) continue;
    const current = next[d.key];
    if (current !== undefined && isOptionAvailable(family, fixed, d.key, current)) {
      fixed[d.key] = current;
      continue;
    }
    const firstValid = d.options.find((o) => isOptionAvailable(family, fixed, d.key, o.value));
    if (firstValid) fixed[d.key] = firstValid.value;
  }
  if (resolveVariant(family, fixed)) return fixed;

  // Fallback: first variant that has the chosen value
  const fallback = family.variants.find((v) => v.params[dimKey] === value);
  return fallback ? { ...fallback.params } : params;
}

/** Short summary of a combination, e.g. "Incline · Dumbbell" */
export function formatFamilyParams(family: ExerciseFamily, params: Record<string, string>): string {
  return family.dimensions
    .map((d) => d.options.find((o) => o.value === params[d.key])?.label ?? params[d.key])
    .filter(Boolean)
    .join(' · ');
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Common gym shorthand → word that appears in exercise names */
const SEARCH_ALIASES: Record<string, string[]> = {
  db: ['dumbbell'],
  dbs: ['dumbbell'],
  bb: ['barbell'],
  kb: ['kettlebell'],
  ohp: ['overhead press', 'shoulder press'],
  rdl: ['romanian deadlift'],
  sldl: ['stiff-leg deadlift', 'stiff leg deadlift'],
  ez: ['ez-bar'],
};

function queryWords(query: string): string[] {
  return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

/**
 * Order-independent word match (like matchesAllWords) that also understands a
 * few gym abbreviations ("db" → dumbbell, "bb" → barbell, "ohp", "rdl"...).
 */
function matchesExerciseQuery(text: string, query: string): boolean {
  const words = queryWords(query);
  if (words.length === 0) return true;
  const lower = text.toLowerCase();
  return words.every(
    (w) => lower.includes(w) || (SEARCH_ALIASES[w]?.some((alias) => lower.includes(alias)) ?? false),
  );
}

/** Family matches if the query matches its name or any variant's name */
function familyMatchesQuery(family: ExerciseFamily, query: string): boolean {
  if (!query.trim()) return true;
  if (matchesExerciseQuery(family.name, query)) return true;
  return family.variants.some((v) => matchesExerciseQuery(v.exerciseName, query));
}

/**
 * Params to preselect for a search query: the default if it matches the query
 * (or the query only names the family), else the first matching variant.
 */
export function paramsForQuery(family: ExerciseFamily, query: string): Record<string, string> {
  if (!query.trim()) return { ...family.defaults };
  const defaultVariant = resolveVariant(family, family.defaults);
  if (defaultVariant && matchesExerciseQuery(defaultVariant.exerciseName, query)) {
    return { ...family.defaults };
  }
  const hit = family.variants.find((v) => matchesExerciseQuery(v.exerciseName, query));
  if (hit) return { ...hit.params };
  return { ...family.defaults };
}

// ---------------------------------------------------------------------------
// List entries (picker + library)
// ---------------------------------------------------------------------------

export type ExerciseListEntry =
  | {
      kind: 'family';
      key: string;
      name: string;
      family: ExerciseFamily;
      /** Concrete exercises of this family in the DB */
      members: Exercise[];
      /** Default variant row (if in DB), used for muscle tags / navigation */
      defaultExercise: Exercise | undefined;
    }
  | { kind: 'exercise'; key: string; name: string; exercise: Exercise };

/** One entry per family + every standalone exercise, sorted by name */
export function buildExerciseEntries(exercises: Exercise[], index: FamilyIndex): ExerciseListEntry[] {
  const entries: ExerciseListEntry[] = [];
  for (const ex of exercises) {
    if (!index.byExerciseId.has(ex.id)) {
      entries.push({ kind: 'exercise', key: ex.id, name: ex.name, exercise: ex });
    }
  }
  for (const family of EXERCISE_FAMILIES) {
    const members = getFamilyMembers(index, family);
    entries.push({
      kind: 'family',
      key: `family:${family.id}`,
      name: family.name,
      family,
      members,
      defaultExercise: getVariantExercise(index, family, family.defaults) ?? members[0],
    });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

/**
 * Filter entries: search matches family/variant names (families) or the name
 * (standalone); `predicate` (muscle / equipment / … filters) passes a family
 * if ANY of its variants passes.
 */
export function filterExerciseEntries(
  entries: ExerciseListEntry[],
  query: string,
  predicate?: (exercise: Exercise) => boolean,
): ExerciseListEntry[] {
  const hasQuery = !!query.trim();
  return entries.filter((entry) => {
    if (entry.kind === 'exercise') {
      if (hasQuery && !matchesExerciseQuery(entry.exercise.name, query)) return false;
      return predicate ? predicate(entry.exercise) : true;
    }
    if (hasQuery && !familyMatchesQuery(entry.family, query)) return false;
    return predicate ? entry.members.some(predicate) : true;
  });
}

/** Family name to show as a title for a concrete exercise (or its own name if standalone) */
export function familyTitleFor(exercise: Pick<Exercise, 'name'>): string {
  return findFamilyForExerciseName(exercise.name)?.family.name ?? exercise.name;
}
