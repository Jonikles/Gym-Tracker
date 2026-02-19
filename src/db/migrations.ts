/**
 * Database Migrations
 *
 * All schema changes are handled via Dexie versioning in db/index.ts.
 * This file contains upgrade logic for data migrations when schema changes.
 *
 * Current version: 4
 *
 * Migration history:
 * - v1: Initial schema with exercises, routines, sessions, sessionExercises, sets, prs, settings
 * - v2: Added templates table, restructured routines, simplified sets, updated muscle groups
 * - v3: Templates now define individual sets (TemplateSet[]), removed theme setting
 * - v4: Added progressionMemberships to exercises (Overcoming Gravity progressions)
 */

import { db } from './index';
import type { Template, TemplateExercise, TemplateSet, Routine, RoutineDay, IntensityTechnique } from '../types';
import { PROGRESSION_EXERCISES } from '../data/progression-exercises';

/**
 * Run any necessary migrations
 * Called on app startup before rendering
 */
export async function runMigrations(): Promise<void> {
  // Ensure database is open
  await db.open();

  // Check if we need to migrate old routines to templates
  await migrateRoutinesToTemplates();

  // Migrate templates to new set structure (v3)
  await migrateTemplateSets();

  // Remove theme setting (v3)
  await db.settings.delete('theme');

  // Migrate to progression exercises (v4)
  await migrateProgressionExercises();

  // Clean up any duplicate exercises from past bugs
  await deduplicateExercises();
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
        isArchived: false,
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
        isArchived: routine.isArchived,
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
 * Migrate existing exercises to include progression data (v4)
 * Also adds new progression exercises that don't exist yet.
 * Skips on fresh installs (seed handles it).
 */
async function migrateProgressionExercises(): Promise<void> {
  // Skip on fresh install — seed will handle it
  const exerciseCount = await db.exercises.count();
  if (exerciseCount === 0) return;

  // Check if already migrated
  const sample = await db.exercises
    .filter((e) => e.progressionMemberships !== undefined && e.progressionMemberships.length > 0)
    .first();
  if (sample) return;

  const now = Date.now();
  const existing = await db.exercises.toArray();
  const nameMap = new Map<string, string>(); // lowercase name -> id
  for (const ex of existing) {
    nameMap.set(ex.name.toLowerCase(), ex.id);
  }

  let updated = 0;
  let added = 0;

  for (const def of PROGRESSION_EXERCISES) {
    const existingId = nameMap.get(def.name.toLowerCase());
    if (existingId) {
      // Update existing exercise with progression data
      await db.exercises.update(existingId, {
        progressionMemberships: def.progressionMemberships,
        progressionLevel: def.progressionMemberships[0]?.level,
        muscleGroups: def.muscleGroups,
        movementPattern: def.movementPattern,
        updatedAt: now,
      });
      updated++;
    } else {
      // Add new exercise
      await db.exercises.add({
        id: crypto.randomUUID(),
        name: def.name,
        muscleGroups: def.muscleGroups,
        movementPattern: def.movementPattern,
        equipment: def.equipment,
        defaultFields: def.defaultFields,
        progressionLevel: def.progressionMemberships[0]?.level,
        progressionMemberships: def.progressionMemberships,
        isPreset: true,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });
      added++;
    }
  }

  console.log(`Progression migration: updated ${updated}, added ${added} exercises`);
}

/**
 * Remove duplicate exercises (same name, case-insensitive).
 * Keeps the one with progressionMemberships if available, otherwise the first.
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

  let removed = 0;
  for (const [, group] of nameGroups) {
    if (group.length <= 1) continue;

    // Sort: prefer one with progressionMemberships, then oldest (lowest createdAt)
    group.sort((a, b) => {
      const aHasProg = (a.progressionMemberships?.length ?? 0) > 0 ? 1 : 0;
      const bHasProg = (b.progressionMemberships?.length ?? 0) > 0 ? 1 : 0;
      if (aHasProg !== bHasProg) return bHasProg - aHasProg; // prefer with progression
      return a.createdAt - b.createdAt; // prefer oldest
    });

    // Keep the first, delete the rest
    const keep = group[0];
    for (let i = 1; i < group.length; i++) {
      const dup = group[i];
      // If the duplicate has progressionMemberships that the keeper doesn't, merge them
      if (dup.progressionMemberships?.length && !keep.progressionMemberships?.length) {
        await db.exercises.update(keep.id, {
          progressionMemberships: dup.progressionMemberships,
          progressionLevel: dup.progressionLevel,
        });
      }
      // Reassign any session references from duplicate to keeper
      await db.sessionExercises
        .where('exerciseId')
        .equals(dup.id)
        .modify({ exerciseId: keep.id });
      // Reassign any PRs
      await db.prs
        .where('exerciseId')
        .equals(dup.id)
        .modify({ exerciseId: keep.id });
      // Delete the duplicate
      await db.exercises.delete(dup.id);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`Deduplication: removed ${removed} duplicate exercises`);
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
