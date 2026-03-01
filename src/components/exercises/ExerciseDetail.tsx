import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Card, ConfirmDialog, Modal } from '../common';
import { ExerciseForm, type ExerciseFormData } from './ExerciseForm';
import {
  useExercise,
  useExerciseVariations,
  updateExercise,
  archiveExercise,
  restoreExercise,
  deleteExercise,
  duplicateExercise,
} from '../../hooks/useExercises';
import { PROGRESSION_MAP } from '../../data/progressions';
import { db } from '../../db';
import styles from './ExerciseDetail.module.css';

// Helper to format muscle group keys for display
function formatMuscleGroup(mg: string): string {
  return mg
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper to capitalize first letter
function formatLabel(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const exercise = useExercise(id);
  const variations = useExerciseVariations(exercise?.id);
  const parentExercise = useExercise(exercise?.parentId);

  const [isEditing, setIsEditing] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get the progression IDs this exercise belongs to
  const progressionIds = exercise?.progressionMemberships?.map((pm) => pm.progressionId) ?? [];

  // Query all exercises that share the same progressions to build the level map
  const siblingExercises = useLiveQuery(
    async () => {
      if (progressionIds.length === 0) return [];
      const all = await db.exercises.toArray();
      return all.filter((e) =>
        e.progressionMemberships?.some((pm) => progressionIds.includes(pm.progressionId))
      );
    },
    [progressionIds.join(',')]
  );

  // Build progressionId → level → exerciseId map
  const progressionLevelMap = useMemo(() => {
    const map = new Map<string, Map<number, string>>();
    if (!siblingExercises) return map;
    for (const ex of siblingExercises) {
      if (!ex.progressionMemberships) continue;
      for (const pm of ex.progressionMemberships) {
        let levelMap = map.get(pm.progressionId);
        if (!levelMap) {
          levelMap = new Map();
          map.set(pm.progressionId, levelMap);
        }
        levelMap.set(pm.level, ex.id);
      }
    }
    return map;
  }, [siblingExercises]);

  if (!exercise) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <p>Exercise not found</p>
          <Button onClick={() => navigate('/exercises')}>Back to Library</Button>
        </div>
      </div>
    );
  }

  const handleUpdate = async (data: ExerciseFormData) => {
    await updateExercise(exercise.id, data);
    setIsEditing(false);
  };

  const handleArchive = async () => {
    await archiveExercise(exercise.id);
    setShowArchiveConfirm(false);
    navigate('/exercises');
  };

  const handleRestore = async () => {
    await restoreExercise(exercise.id);
  };

  const handleDelete = async () => {
    await deleteExercise(exercise.id);
    setShowDeleteConfirm(false);
    navigate('/exercises');
  };

  const handleDuplicate = async () => {
    const newId = await duplicateExercise(exercise.id);
    navigate(`/exercises/${newId}`);
  };

  return (
    <div className="page">
      <div className={styles.container}>
        <header className={styles.header}>
          <Button variant="ghost" onClick={() => navigate('/exercises')}>
            ← Back
          </Button>
          <div className={styles.actions}>
            {!exercise.isPreset && !exercise.isArchived && (
              <>
                <Button variant="secondary" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={handleDuplicate}>
                  Duplicate
                </Button>
                <Button variant="ghost" onClick={() => setShowArchiveConfirm(true)}>
                  Archive
                </Button>
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                  Delete
                </Button>
              </>
            )}
            {exercise.isArchived && (
              <>
                <Button variant="secondary" onClick={handleRestore}>
                  Restore
                </Button>
                {!exercise.isPreset && (
                  <Button variant="ghost" onClick={() => setShowDeleteConfirm(true)}>
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </header>

      <Card className={styles.mainCard}>
        <div className={styles.titleRow}>
          <h1 className={styles.name}>{exercise.name}</h1>
          <div className={styles.badges}>
            {exercise.isPreset && <span className={styles.badge}>Preset</span>}
            {exercise.isArchived && <span className={`${styles.badge} ${styles.archivedBadge}`}>Archived</span>}
          </div>
        </div>

        <div className={styles.infoSection}>
          {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Muscle Groups</span>
              <div className={styles.tagList}>
                {exercise.muscleGroups.map((mg) => (
                  <span key={mg} className={styles.tag}>
                    {formatMuscleGroup(mg)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {exercise.equipment && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Equipment</span>
              <span className={styles.value}>{formatLabel(exercise.equipment)}</span>
            </div>
          )}

          {exercise.movementPattern && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Movement</span>
              <span className={styles.value}>{formatLabel(exercise.movementPattern)}</span>
            </div>
          )}

          {parentExercise && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Variation Of</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/exercises/${parentExercise.id}`)}
                className={styles.parentLink}
              >
                {parentExercise.name} →
              </Button>
            </div>
          )}
        </div>

        {/* Progression memberships */}
        {exercise.progressionMemberships && exercise.progressionMemberships.length > 0 && (
          <div className={styles.progressionSection}>
            <span className={styles.label}>Progressions</span>
            {exercise.progressionMemberships.map((pm) => {
              const progDef = PROGRESSION_MAP[pm.progressionId];
              const progName = progDef?.name ?? pm.progressionId;
              const levelMap = progressionLevelMap.get(pm.progressionId);
              // Find nearest lower and higher levels (handles gaps like 15 → 17)
              const levels = levelMap ? [...levelMap.keys()].sort((a, b) => a - b) : [];
              const prevLevel = levels.filter((l) => l < pm.level).pop();
              const nextLevel = levels.find((l) => l > pm.level);
              const prevId = prevLevel !== undefined ? levelMap?.get(prevLevel) : undefined;
              const nextId = nextLevel !== undefined ? levelMap?.get(nextLevel) : undefined;

              return (
                <div key={pm.progressionId} className={styles.progressionRow}>
                  <span className={styles.levelBadge}>Lvl {pm.level}</span>
                  <button
                    className={styles.progressionLink}
                    onClick={() => navigate(`/progressions/${pm.progressionId}`)}
                    title={`View ${progName} progression`}
                  >
                    {progName}
                  </button>
                  <div className={styles.progressionNav}>
                    {prevId && prevLevel !== undefined && (
                      <button
                        className={styles.progressionNavBtn}
                        onClick={() => navigate(`/exercises/${prevId}`)}
                        title={`Go to level ${prevLevel}`}
                      >
                        ◀ Lvl {prevLevel}
                      </button>
                    )}
                    {nextId && nextLevel !== undefined && (
                      <button
                        className={styles.progressionNavBtn}
                        onClick={() => navigate(`/exercises/${nextId}`)}
                        title={`Go to level ${nextLevel}`}
                      >
                        Lvl {nextLevel} ▶
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Placeholder for future: photo/video/instructions */}
        <div className={styles.mediaPlaceholder}>
          <span className={styles.placeholderIcon}>📷</span>
          <span className={styles.placeholderText}>Photo/video/instructions coming soon</span>
        </div>
      </Card>

      {/* Variations section */}
      {variations && variations.length > 0 && (
        <Card className={styles.variationsCard}>
          <h2 className={styles.sectionTitle}>Variations</h2>
          <div className={styles.variationsList}>
            {variations.map((v) => (
              <Button
                key={v.id}
                variant="ghost"
                onClick={() => navigate(`/exercises/${v.id}`)}
                className={styles.variationItem}
              >
                {v.name}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Exercise"
      >
        <ExerciseForm
          exercise={exercise}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      </Modal>

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Archive Exercise"
        message={`Archive "${exercise.name}"? It will no longer appear in the exercise list but will remain in your history.`}
        confirmLabel="Archive"
        variant="danger"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Exercise Permanently"
        message={`Delete "${exercise.name}" permanently? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
      </div>
    </div>
  );
}
