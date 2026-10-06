import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Template, Routine } from '../types';

/**
 * Query all templates with optional filters
 */
export function useTemplates(filters?: { search?: string }) {
  return useLiveQuery(
    async () => {
      let templates = await db.templates.toArray();

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
    [filters?.search]
  );
}

/**
 * Create a new template
 */
export async function createTemplate(
  input: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // Check for duplicate name
  const existing = await db.templates
    .filter((t) => t.name.toLowerCase() === input.name.trim().toLowerCase())
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
    createdAt: now,
    updatedAt: now,
  };

  await db.templates.add(template);
  return id;
}

/**
 * Update an existing template (rejects renaming to a duplicate name)
 */
export async function updateTemplate(
  id: string,
  input: Partial<Omit<Template, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  // If name is being changed, check for duplicates
  if (input.name !== undefined) {
    const existing = await db.templates
      .filter(
        (t) =>
          t.id !== id &&
          t.name.toLowerCase() === input.name!.trim().toLowerCase()
      )
      .first();

    if (existing) {
      throw new Error('A template with this name already exists');
    }
  }

  const { name, ...rest } = input;
  await db.templates.update(id, {
    ...rest,
    ...(name !== undefined ? { name: name.trim() } : {}),
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
async function removeTemplateFromRoutines(templateId: string): Promise<void> {
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

