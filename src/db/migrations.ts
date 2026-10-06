/**
 * Database Migrations
 *
 * All schema changes are handled via Dexie versioning in db/index.ts.
 * This file contains upgrade logic for data migrations when schema changes,
 * plus the app's single startup entry point, initializeDatabase().
 *
 * Current schema version: 8
 *
 * Migration history:
 * - v1: Initial schema with exercises, routines, sessions, sessionExercises, sets, prs, settings
 * - v2: Added templates table, restructured routines, simplified sets, updated muscle groups
 * - v3: Templates now define individual sets (TemplateSet[]), removed theme setting
 * - v4: Added progressionMemberships to exercises (Overcoming Gravity progressions)
 * - v5: Added progressionId index to sessionExercises (progression slots in templates)
 * - v6: Added body measurements table
 * - v7: Removed archive feature (isArchived) from exercises, templates, routines
 * - v8: Added setId index to prs (PR lookup/cleanup by set)
 */

import { db } from './index';
import type { Exercise, Template, TemplateExercise, TemplateSet, Routine, RoutineDay, IntensityTechnique } from '../types';
import { PROGRESSION_EXERCISES } from '../data/progression-exercises';
import { presetExercises, seedDatabase } from './seed';
import { autoSkipMissedWorkouts } from '../utils/autoSkip';

/**
 * Run any necessary migrations
 * Called on app startup (via initializeDatabase) before rendering
 */
export async function runMigrations(): Promise<void> {
  // Ensure database is open
  await db.open();

  // Check if we need to migrate old routines to templates
  await migrateRoutinesToTemplates();

  // Migrate templates to new set structure (v3)
  await migrateTemplateSets();

  // Exercise-library maintenance runs in one readwrite transaction so concurrent
  // callers (StrictMode double effects, multiple tabs) serialize instead of each
  // inserting their own copy of a "missing" exercise.
  await db.transaction('rw', [db.exercises, db.sessionExercises, db.prs, db.templates], async () => {
    // Sync progression exercises (v4+)
    await migrateProgressionExercises();
    // Clean up any duplicate exercises from past bugs
    await deduplicateExercises();
    // Add any new preset exercises that don't exist yet (e.g. added in later app versions)
    await addNewPresetExercises();
  });

  // Auto-skip scheduled workout days that passed with nothing logged
  await autoSkipMissedWorkouts();
}

let initPromise: Promise<void> | null = null;

/**
 * Single entry point for database startup: open → seed if fresh → migrate.
 *
 * Memoized at module level so concurrent calls (e.g. React StrictMode running
 * the init effect twice) share one run instead of seeding/migrating twice.
 * If it fails, the memo is cleared so a later call can retry.
 */
export function initializeDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const fresh = await isFreshInstall();
      if (fresh) {
        await seedDatabase();
      }
      await runMigrations();
    })();
    initPromise.catch(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

/**
 * Migrate v1 routines (which had embedded exercises) to v2 structure
 * - Create a template from each routine's exercises
 * - Update routine to reference the template
 */
async function migrateRoutinesToTemplates(): Promise<void> {
  // Check if migration is needed by looking for routines with old structure
  const routines = await db.routines.toArray();
  
  for (const routine of routines) {
    // Check if routine has old structure (exercises array instead of schedule)
    const oldRoutine = routine as unknown as {
      id: string;
      name: string;
      type: string;
      exercises?: Array<{
        exerciseId: string;
        order: number;
        groupId?: string;
        groupType?: 'superset' | 'circuit';
        groupOrder?: number;
        defaultSets?: number;
        defaultReps?: number | string;
        defaultWeight?: number;
        notes?: string;
      }>;
      scheduleDays?: number[];
      schedule?: RoutineDay[];
    };
    
    if (oldRoutine.exercises && oldRoutine.exercises.length > 0 && !oldRoutine.schedule) {
      console.log(`Migrating routine: ${routine.name}`);
      
      // Create a template from the routine's exercises
      const templateId = crypto.randomUUID();
      const now = Date.now();
      
      const templateExercises: TemplateExercise[] = oldRoutine.exercises.map((ex) => {
        const setCount = ex.defaultSets ?? 3;
        const targetReps = String(ex.defaultReps ?? '8-12');
        
        // Create individual TemplateSet entries (without targetReps - it's at exercise level now)
        const sets: TemplateSet[] = [];
        for (let i = 0; i < setCount; i++) {
          sets.push({
            order: i,
            isWarmup: false,
            intensityTechnique: 'standard',
          });
        }
        
        return {
          exerciseId: ex.exerciseId,
          order: ex.order,
          sets: sets,
          targetReps: targetReps, // Now at exercise level
          weight: ex.defaultWeight,
          groupId: ex.groupId,
          groupType: ex.groupType,
          groupOrder: ex.groupOrder,
          notes: ex.notes,
        };
      });
      
      const template: Template = {
        id: templateId,
        name: routine.name,
        exercises: templateExercises,
        createdAt: now,
        updatedAt: now,
      };
      
      await db.templates.add(template);
      
      // Create new routine structure with schedule
      const schedule: RoutineDay[] = [];
      
      if (routine.type === 'fixed' && oldRoutine.scheduleDays) {
        // Create 7-day schedule with template on scheduled days
        for (let i = 0; i < 7; i++) {
          schedule.push({
            dayIndex: i,
            templateId: oldRoutine.scheduleDays.includes(i) ? templateId : undefined,
            label: oldRoutine.scheduleDays.includes(i) ? routine.name : 'Rest',
          });
        }
      } else if (routine.type === 'rolling') {
        // For rolling, create a single-day schedule with the template
        schedule.push({
          dayIndex: 0,
          templateId: templateId,
          label: routine.name,
        });
      } else {
        // Default: just one day with the template
        schedule.push({
          dayIndex: 0,
          templateId: templateId,
          label: routine.name,
        });
      }
      
      // Update routine with new structure
      const newRoutine: Routine = {
        id: routine.id,
        name: routine.name,
        type: routine.type,
        schedule: schedule,
        currentPosition: routine.currentPosition ?? 0,
        createdAt: routine.createdAt,
        updatedAt: now,
      };
      
      await db.routines.put(newRoutine);
      console.log(`Migrated routine ${routine.name} → template ${templateId}`);
    }
  }
}

/**
 * Migrate v2 templates (sets: number, reps: string) to v3 (sets: TemplateSet[], targetReps on exercise)
 */
async function migrateTemplateSets(): Promise<void> {
  const templates = await db.templates.toArray();
  
  for (const template of templates) {
    let needsMigration = false;
    
    // Check each exercise to see if it has old structure
    const migratedExercises: TemplateExercise[] = template.exercises.map((exercise) => {
      // Check if exercise has old structure (sets as number, separate reps field)
      const oldExercise = exercise as unknown as {
        exerciseId: string;
        order: number;
        sets?: number | TemplateSet[] | Array<{ targetReps?: string; order: number; isWarmup: boolean; intensityTechnique: IntensityTechnique }>;
        reps?: string;
        targetReps?: string;
        weight?: number;
        intensityTechnique?: IntensityTechnique;
        groupId?: string;
        groupType?: 'superset' | 'circuit';
        groupOrder?: number;
        notes?: string;
      };
      
      // If sets is a number (old v1 format), convert to TemplateSet[]
      if (typeof oldExercise.sets === 'number') {
        needsMigration = true;
        const setCount = oldExercise.sets;
        const targetReps = oldExercise.reps ?? '8-12';
        const technique = oldExercise.intensityTechnique ?? 'standard';
        
        const templateSets: TemplateSet[] = [];
        for (let i = 0; i < setCount; i++) {
          templateSets.push({
            order: i,
            isWarmup: false,
            intensityTechnique: technique,
          });
        }
        
        return {
          exerciseId: oldExercise.exerciseId,
          order: oldExercise.order,
          sets: templateSets,
          targetReps: targetReps,
          weight: oldExercise.weight,
          groupId: oldExercise.groupId,
          groupType: oldExercise.groupType,
          groupOrder: oldExercise.groupOrder,
          notes: oldExercise.notes,
        } as TemplateExercise;
      }
      
      // If sets have targetReps (old v2 format with per-set targetReps), migrate
      if (Array.isArray(oldExercise.sets) && oldExercise.sets.length > 0) {
        const firstSet = oldExercise.sets[0];
        if ('targetReps' in firstSet && firstSet.targetReps) {
          needsMigration = true;
          const targetReps = firstSet.targetReps;
          const migratedSets: TemplateSet[] = oldExercise.sets.map((s) => ({
            order: s.order,
            isWarmup: s.isWarmup,
            intensityTechnique: s.intensityTechnique,
          }));
          
          return {
            exerciseId: oldExercise.exerciseId,
            order: oldExercise.order,
            sets: migratedSets,
            targetReps: targetReps,
            weight: oldExercise.weight,
            groupId: oldExercise.groupId,
            groupType: oldExercise.groupType,
            groupOrder: oldExercise.groupOrder,
            notes: oldExercise.notes,
          } as TemplateExercise;
        }
      }
      
      return exercise;
    });
    
    if (needsMigration) {
      console.log(`Migrating template sets: ${template.name}`);
      await db.templates.put({
        ...template,
        exercises: migratedExercises,
        updatedAt: Date.now(),
      });
    }
  }
}

/**
 * Sync progression exercises (v4+) into an existing install.
 *
 * Runs on every startup and is cheap: one read of the exercises table, then only
 * writes what's missing or out of date. Adds any progression exercise whose name
 * doesn't exist yet (so newly defined progression exercises reach existing installs)
 * and updates memberships on existing exercises only when they differ.
 * Skips on fresh installs (seed handles it).
 */
async function migrateProgressionExercises(): Promise<void> {
  const existing = await db.exercises.toArray();
  if (existing.length === 0) return; // fresh install — seed will handle it

  const now = Date.now();
  const byName = new Map<string, Exercise>(); // lowercase name -> exercise
  for (const ex of existing) {
    const key = ex.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, ex);
  }

  const toAdd: Exercise[] = [];
  let updated = 0;

  for (const def of PROGRESSION_EXERCISES) {
    const key = def.name.toLowerCase();
    const ex = byName.get(key);
    if (ex) {
      const same =
        JSON.stringify(ex.progressionMemberships ?? []) === JSON.stringify(def.progressionMemberships);
      if (same) continue;
      const hadMemberships = (ex.progressionMemberships?.length ?? 0) > 0;
      await db.exercises.update(ex.id, {
        progressionMemberships: def.progressionMemberships,
        progressionLevel: def.progressionMemberships[0]?.level,
        // First-time enrichment also aligns muscle groups / pattern with the
        // progression definition; later membership updates leave them alone.
        ...(hadMemberships ? {} : { muscleGroups: def.muscleGroups, movementPattern: def.movementPattern }),
        updatedAt: now,
      });
      updated++;
    } else {
      const newEx: Exercise = {
        id: crypto.randomUUID(),
        name: def.name,
        muscleGroups: def.muscleGroups,
        movementPattern: def.movementPattern,
        equipment: def.equipment,
        defaultFields: def.defaultFields,
        progressionLevel: def.progressionMemberships[0]?.level,
        progressionMemberships: def.progressionMemberships,
        isPreset: true,
        createdAt: now,
        updatedAt: now,
      };
      toAdd.push(newEx);
      byName.set(key, newEx);
    }
  }

  if (toAdd.length > 0) await db.exercises.bulkAdd(toAdd);
  if (updated > 0 || toAdd.length > 0) {
    console.log(`Progression sync: updated ${updated}, added ${toAdd.length} exercises`);
  }
}

/**
 * Remove duplicate exercises (same name, case-insensitive).
 * Keeps the one with progressionMemberships if available, otherwise the oldest.
 * Every reference to a removed duplicate (session exercises, PRs, template
 * exercises, and other exercises' parentId) is repointed to the kept exercise.
 * Template exercises pointing at an exercise that no longer exists for some other
 * reason can't be recovered and are left alone.
 * Runs on every startup to clean up any past duplication bugs.
 */
async function deduplicateExercises(): Promise<void> {
  const all = await db.exercises.toArray();
  const nameGroups = new Map<string, typeof all>();

  for (const ex of all) {
    const key = ex.name.toLowerCase();
    const group = nameGroups.get(key);
    if (group) {
      group.push(ex);
    } else {
      nameGroups.set(key, [ex]);
    }
  }

  const remap = new Map<string, string>(); // duplicate id -> kept id
  for (const [, group] of nameGroups) {
    if (group.length <= 1) continue;

    // Sort: prefer one with progressionMemberships, then oldest (lowest createdAt)
    group.sort((a, b) => {
      const aHasProg = (a.progressionMemberships?.length ?? 0) > 0 ? 1 : 0;
      const bHasProg = (b.progressionMemberships?.length ?? 0) > 0 ? 1 : 0;
      if (aHasProg !== bHasProg) return bHasProg - aHasProg; // prefer with progression
      return a.createdAt - b.createdAt; // prefer oldest
    });

    const keep = group[0];
    for (let i = 1; i < group.length; i++) {
      const dup = group[i];
      // If the duplicate has progressionMemberships that the keeper doesn't, merge them
      if (dup.progressionMemberships?.length && !keep.progressionMemberships?.length) {
        await db.exercises.update(keep.id, {
          progressionMemberships: dup.progressionMemberships,
          progressionLevel: dup.progressionLevel,
        });
        keep.progressionMemberships = dup.progressionMemberships;
      }
      remap.set(dup.id, keep.id);
    }
  }

  if (remap.size === 0) return;
  const dupIds = [...remap.keys()];
  const resolve = (id: string) => remap.get(id) ?? id;

  // Reassign session references and PRs
  await db.sessionExercises
    .where('exerciseId')
    .anyOf(dupIds)
    .modify((se) => { se.exerciseId = resolve(se.exerciseId); });
  await db.prs
    .where('exerciseId')
    .anyOf(dupIds)
    .modify((pr) => { pr.exerciseId = resolve(pr.exerciseId); });

  // Reassign variations whose parent was a duplicate
  await db.exercises
    .where('parentId')
    .anyOf(dupIds)
    .modify((ex) => {
      const parent = resolve(ex.parentId!);
      ex.parentId = parent === ex.id ? undefined : parent;
    });

  // Reassign template exercises
  const templates = await db.templates.toArray();
  for (const t of templates) {
    if (!t.exercises.some((te) => remap.has(te.exerciseId))) continue;
    await db.templates.update(t.id, {
      exercises: t.exercises.map((te) =>
        remap.has(te.exerciseId) ? { ...te, exerciseId: resolve(te.exerciseId) } : te
      ),
    });
  }

  await db.exercises.bulkDelete(dupIds);
  console.log(`Deduplication: removed ${dupIds.length} duplicate exercises`);
}

/**
 * Add any preset exercises defined in seed.ts that don't exist in the DB yet
 * (presetExercises includes NEW_FAMILY_EXERCISES — the exercise-family variants).
 * Lets new presets (e.g. Kelso Shrug) reach existing installs, not just fresh ones.
 */
async function addNewPresetExercises(): Promise<void> {
  const existing = await db.exercises.toArray();
  if (existing.length === 0) return; // fresh install — seed will handle it

  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));

  const now = Date.now();
  const toAdd: Exercise[] = [];
  for (const def of presetExercises) {
    const key = def.name.toLowerCase();
    if (existingNames.has(key)) continue;
    existingNames.add(key); // guard against duplicate names within presetExercises
    toAdd.push({
      id: crypto.randomUUID(),
      name: def.name,
      muscleGroups: def.muscleGroups,
      movementPattern: def.movementPattern,
      equipment: def.equipment,
      defaultFields: def.defaultFields,
      isPreset: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (toAdd.length > 0) {
    await db.exercises.bulkAdd(toAdd);
    console.log(`Added ${toAdd.length} new preset exercise(s): ${toAdd.map((e) => e.name).join(', ')}`);
  }
}

/**
 * Check if this is a fresh install (no data)
 * Opens the DB if not already open.
 */
export async function isFreshInstall(): Promise<boolean> {
  await db.open();
  const exerciseCount = await db.exercises.count();
  return exerciseCount === 0;
}
