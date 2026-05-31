import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Template, TemplateExercise, Routine } from '../types';

/**
 * Query all templates with optional filters
 */
export function useTemplates(filters?: { includeArchived?: boolean; search?: string }) {
  return useLiveQuery(
    async () => {
      let query = db.templates.toCollection();

      // Filter archived
      if (!filters?.includeArchived) {
        query = query.filter((t) => !t.isArchived);
      }

      let templates = await query.toArray();

      // Search filter
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        templates = templates.filter((t) =>
          t.name.toLowerCase().includes(searchLower)
        );
      }

      // Sort by name
      return templates.sort((a, b) => a.name.localeCompare(b.name));
    },
    [filters?.includeArchived, filters?.search]
  );
}

/**
 * Get a single template by ID
 */
export function useTemplate(id: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!id) return undefined;
      return db.templates.get(id);
    },
    [id]
  );
}

/**
 * Create a new template
 */
export async function createTemplate(
  input: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>
): Promise<string> {
  // Check for duplicate name
  const existing = await db.templates
    .filter((t) => t.name.toLowerCase() === input.name.trim().toLowerCase() && !t.isArchived)
    .first();
  
  if (existing) {
    throw new Error('A template with this name already exists');
  }

  const now = Date.now();
  const id = crypto.randomUUID();

  const template: Template = {
    id,
    name: input.name.trim(),
    exercises: input.exercises,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.templates.add(template);
  return id;
}

/**
 * Update an existing template
 * v1.4.1: Added duplicate name check when renaming
 */
export async function updateTemplate(
  id: string,
  input: Partial<Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>>
): Promise<void> {
  // v1.4.1: If name is being changed, check for duplicates
  if (input.name !== undefined) {
    const existing = await db.templates
      .filter(
        (t) =>
          t.id !== id &&
          t.name.toLowerCase() === input.name!.trim().toLowerCase() &&
          !t.isArchived
      )
      .first();

    if (existing) {
      throw new Error('A template with this name already exists');
    }
  }

  await db.templates.update(id, {
    ...input,
    name: input.name?.trim(),
    updatedAt: Date.now(),
  });
}

/**
 * Archive a template (soft delete)
 */
export async function archiveTemplate(id: string): Promise<void> {
  await db.templates.update(id, {
    isArchived: true,
    updatedAt: Date.now(),
  });
}

/**
 * Restore an archived template
 */
export async function restoreTemplate(id: string): Promise<void> {
  await db.templates.update(id, {
    isArchived: false,
    updatedAt: Date.now(),
  });
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(id: string): Promise<string> {
  const template = await db.templates.get(id);
  if (!template) throw new Error('Template not found');

  const now = Date.now();
  const newId = crypto.randomUUID();

  const newTemplate: Template = {
    id: newId,
    name: `${template.name} (Copy)`,
    exercises: template.exercises.map((e) => ({ ...e })),
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.templates.add(newTemplate);
  return newId;
}

/**
 * Find all routines that reference a given template
 */
export async function getRoutinesUsingTemplate(templateId: string): Promise<Routine[]> {
  const allRoutines = await db.routines.toArray();
  return allRoutines.filter((r) =>
    r.schedule.some((day) => day.templateId === templateId)
  );
}

/**
 * Remove a template reference from all routines (set those days back to rest days).
 * If removing the template leaves a routine with ALL rest days (no templates left),
 * the routine is automatically deleted.
 */
export async function removeTemplateFromRoutines(templateId: string): Promise<void> {
  const affectedRoutines = await getRoutinesUsingTemplate(templateId);
  for (const routine of affectedRoutines) {
    const updatedSchedule = routine.schedule.map((day) =>
      day.templateId === templateId
        ? { ...day, templateId: undefined, label: undefined }
        : day
    );

    // Check if the routine would become all rest days
    const hasAnyTemplate = updatedSchedule.some((day) => day.templateId);
    if (!hasAnyTemplate) {
      // Delete the routine entirely — it has no workout days left
      await db.routines.delete(routine.id);
    } else {
      await db.routines.update(routine.id, {
        schedule: updatedSchedule,
        updatedAt: Date.now(),
      });
    }
  }
}

/**
 * Delete a template permanently and clean up routine references
 */
export async function deleteTemplate(id: string): Promise<void> {
  await removeTemplateFromRoutines(id);
  await db.templates.delete(id);
}

/**
 * Add an exercise to a template
 */
export async function addExerciseToTemplate(
  templateId: string,
  exercise: Omit<TemplateExercise, 'order'>
): Promise<void> {
  const template = await db.templates.get(templateId);
  if (!template) throw new Error('Template not found');

  const maxOrder = template.exercises.reduce((max, e) => Math.max(max, e.order), -1);

  const newExercise: TemplateExercise = {
    ...exercise,
    order: maxOrder + 1,
  };

  await db.templates.update(templateId, {
    exercises: [...template.exercises, newExercise],
    updatedAt: Date.now(),
  });
}

/**
 * Remove an exercise from a template by order index.
 * Uses order instead of exerciseId to handle progression slots
 * (two progression slots could share the same default exerciseId).
 */
export async function removeExerciseFromTemplate(
  templateId: string,
  exerciseId: string,
  order?: number
): Promise<void> {
  const template = await db.templates.get(templateId);
  if (!template) throw new Error('Template not found');

  const updatedExercises = template.exercises
    .filter((e) => {
      // If order is provided, match by order (more precise for progression slots)
      if (order !== undefined) return e.order !== order;
      return e.exerciseId !== exerciseId;
    })
    .map((e, index) => ({ ...e, order: index }));

  await db.templates.update(templateId, {
    exercises: updatedExercises,
    updatedAt: Date.now(),
  });
}

/**
 * Reorder exercises in a template
 */
export async function reorderTemplateExercises(
  templateId: string,
  fromIndex: number,
  toIndex: number
): Promise<void> {
  const template = await db.templates.get(templateId);
  if (!template) throw new Error('Template not found');

  const exercises = [...template.exercises].sort((a, b) => a.order - b.order);
  const [moved] = exercises.splice(fromIndex, 1);
  exercises.splice(toIndex, 0, moved);

  const reordered = exercises.map((e, index) => ({ ...e, order: index }));

  await db.templates.update(templateId, {
    exercises: reordered,
    updatedAt: Date.now(),
  });
}

/**
 * Update an exercise within a template.
 * When order is provided, matches by order (required for progression slots).
 */
export async function updateTemplateExercise(
  templateId: string,
  exerciseId: string,
  updates: Partial<Omit<TemplateExercise, 'exerciseId' | 'order'>>,
  order?: number
): Promise<void> {
  const template = await db.templates.get(templateId);
  if (!template) throw new Error('Template not found');

  const updatedExercises = template.exercises.map((e) => {
    if (order !== undefined) {
      return e.order === order ? { ...e, ...updates } : e;
    }
    return e.exerciseId === exerciseId ? { ...e, ...updates } : e;
  });

  await db.templates.update(templateId, {
    exercises: updatedExercises,
    updatedAt: Date.now(),
  });
}

/**
 * Group exercises in a template (superset/circuit)
 */
export async function groupTemplateExercises(
  templateId: string,
  exerciseIds: string[],
  groupType: 'superset' | 'circuit'
): Promise<void> {
  const template = await db.templates.get(templateId);
  if (!template) throw new Error('Template not found');

  const groupId = crypto.randomUUID();

  const updatedExercises = template.exercises.map((e) => {
    if (exerciseIds.includes(e.exerciseId)) {
      const groupOrder = exerciseIds.indexOf(e.exerciseId);
      return { ...e, groupId, groupType, groupOrder };
    }
    return e;
  });

  await db.templates.update(templateId, {
    exercises: updatedExercises,
    updatedAt: Date.now(),
  });
}

/**
 * Ungroup exercises in a template
 */
export async function ungroupTemplateExercises(
  templateId: string,
  groupId: string
): Promise<void> {
  const template = await db.templates.get(templateId);
  if (!template) throw new Error('Template not found');

  const updatedExercises = template.exercises.map((e) => {
    if (e.groupId === groupId) {
      const { groupId: _, groupType: __, groupOrder: ___, ...rest } = e;
      return rest as TemplateExercise;
    }
    return e;
  });

  await db.templates.update(templateId, {
    exercises: updatedExercises,
    updatedAt: Date.now(),
  });
}
