import Dexie, { type Table } from 'dexie';
import type { Exercise, Routine, Session, SessionExercise, Set, PR, Setting, Template, BodyMeasurement } from '../types';

/**
 * GymTrackerDB - Dexie database instance with all tables
 */
export class GymTrackerDB extends Dexie {
  exercises!: Table<Exercise, string>;
  templates!: Table<Template, string>;
  routines!: Table<Routine, string>;
  sessions!: Table<Session, string>;
  sessionExercises!: Table<SessionExercise, string>;
  sets!: Table<Set, string>;
  prs!: Table<PR, string>;
  settings!: Table<Setting, string>;
  measurements!: Table<BodyMeasurement, string>;

  constructor() {
    super('GymTrackerDB');

    // Version 1 - Initial schema
    this.version(1).stores({
      exercises: 'id, name, parentId, *muscleGroups, equipment, isArchived',
      routines: 'id, name, type, isArchived',
      sessions: 'id, routineId, startedAt, completedAt',
      sessionExercises: 'id, sessionId, exerciseId, groupId',
      sets: 'id, sessionExerciseId, order',
      prs: 'id, exerciseId, type, achievedAt',
      settings: 'key',
    });

    // Version 2 - Added templates, restructured routines, simplified sets
    this.version(2).stores({
      exercises: 'id, name, parentId, *muscleGroups, equipment, isArchived',
      templates: 'id, name, isArchived', // NEW table
      routines: 'id, name, type, isArchived',
      sessions: 'id, routineId, templateId, startedAt, completedAt', // Added templateId
      sessionExercises: 'id, sessionId, exerciseId, groupId',
      sets: 'id, sessionExerciseId, order',
      prs: 'id, exerciseId, type, achievedAt',
      settings: 'key',
    }).upgrade(async () => {
      // Migration logic: Convert old routines to templates + new routine structure
      // This is handled in migrations.ts for complex data transformations
      console.log('Upgrading database to version 2...');
    });

    // Version 3 - Templates now define individual sets, removed theme setting
    this.version(3).stores({
      exercises: 'id, name, parentId, *muscleGroups, equipment, isArchived',
      templates: 'id, name, isArchived',
      routines: 'id, name, type, isArchived',
      sessions: 'id, routineId, templateId, startedAt, completedAt',
      sessionExercises: 'id, sessionId, exerciseId, groupId',
      sets: 'id, sessionExerciseId, order',
      prs: 'id, exerciseId, type, achievedAt',
      settings: 'key',
    }).upgrade(async () => {
      // Migration handled in migrations.ts
      console.log('Upgrading database to version 3...');
    });

    // Version 4 - Added progressionMemberships to exercises, progression PR type
    this.version(4).stores({
      exercises: 'id, name, parentId, *muscleGroups, equipment, isArchived',
      templates: 'id, name, isArchived',
      routines: 'id, name, type, isArchived',
      sessions: 'id, routineId, templateId, startedAt, completedAt',
      sessionExercises: 'id, sessionId, exerciseId, groupId',
      sets: 'id, sessionExerciseId, order',
      prs: 'id, exerciseId, type, achievedAt',
      settings: 'key',
    }).upgrade(async () => {
      console.log('Upgrading database to version 4 - progression exercises...');
    });

    // Version 5 - Added progressionId index to sessionExercises for progression slots
    this.version(5).stores({
      exercises: 'id, name, parentId, *muscleGroups, equipment, isArchived',
      templates: 'id, name, isArchived',
      routines: 'id, name, type, isArchived',
      sessions: 'id, routineId, templateId, startedAt, completedAt',
      sessionExercises: 'id, sessionId, exerciseId, groupId, progressionId',
      sets: 'id, sessionExerciseId, order',
      prs: 'id, exerciseId, type, achievedAt',
      settings: 'key',
    }).upgrade(async () => {
      console.log('Upgrading database to version 5 - progression slots...');
    });

    // Version 6 - Added body measurements table
    this.version(6).stores({
      exercises: 'id, name, parentId, *muscleGroups, equipment, isArchived',
      templates: 'id, name, isArchived',
      routines: 'id, name, type, isArchived',
      sessions: 'id, routineId, templateId, startedAt, completedAt',
      sessionExercises: 'id, sessionId, exerciseId, groupId, progressionId',
      sets: 'id, sessionExerciseId, order',
      prs: 'id, exerciseId, type, achievedAt',
      settings: 'key',
      measurements: 'id, date', // NEW table
    }).upgrade(async () => {
      console.log('Upgrading database to version 6 - body measurements...');
    });
  }
}

// Single database instance
export const db = new GymTrackerDB();
