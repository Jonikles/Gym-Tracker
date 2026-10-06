import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, ConfirmDialog, Modal, SkeletonList } from '../common';
import { formatMuscleGroup, formatLabel } from '../common/format';
import { ExerciseForm, type ExerciseFormData } from './ExerciseForm';
import {
  useExercise,
  useExerciseVariations,
  updateExercise,
  deleteExercise,
  duplicateExercise,
  toggleFavorite,
} from '../../hooks/useExercises';
import { findFamilyForExerciseName } from '../../data/exercise-families';
import { VariantChips } from './VariantChips';
import { useCurrentPRs } from '../../hooks/usePRs';
import { formatPRValue } from '../../utils/pr';
import { PROGRESSION_MAP } from '../../data/progressions';
import { MuscleHighlighter } from './MuscleHighlighter';
import { ExerciseImage } from './ExerciseImage';
import { useFamilyIndex } from '../../hooks/useExerciseFamilies';
import { db } from '../../db';
import styles from './ExerciseDetail.module.css';

export function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // undefined = loading, null = not found
  const exercise = useLiveQuery(
    async () => (id ? (await db.exercises.get(id)) ?? null : null),
    [id]
  );
  const variations = useExerciseVariations(exercise?.id);
  const parentExercise = useExercise(exercise?.parentId);
  const currentPRs = useCurrentPRs(exercise?.id);
  // Variant chips only browse to rows that already exist (never create them here)
  const { index: familyIndex } = useFamilyIndex();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

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

  const family = exercise ? findFamilyForExerciseName(exercise.name)?.family : undefined;

  if (exercise === undefined) {
    return (
      <div className="page">
        <div className={styles.container}>
          <SkeletonList count={3} lines={3} />
        </div>
      </div>
    );
  }

  if (exercise === null) {
    return (
      <div className="page">
        <div className={styles.container}>
          <div className={styles.notFound}>
            <p>Exercise not found</p>
            <Button onClick={() => navigate('/exercises')}>Back to Library</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdate = async (data: ExerciseFormData) => {
    await updateExercise(exercise.id, data);
    setIsEditing(false);
  };

  // Throws (e.g. exercise in use) are caught and shown by ConfirmDialog
  const handleDelete = async () => {
    await deleteExercise(exercise.id);
    navigate('/exercises');
  };

  const handleDuplicate = async () => {
    if (duplicating) return;
    setActionError(null);
    setDuplicating(true);
    try {
      const newId = await duplicateExercise(exercise.id);
      navigate(`/exercises/${newId}`);
    } catch (err) {
      console.error('Duplicate failed:', err);
      setActionError(err instanceof Error ? err.message : 'Could not duplicate exercise');
    } finally {
      setDuplicating(false);
    }
  };

  const progressions = exercise.progressionMemberships ?? [];
  const muscles = exercise.muscleGroups ?? [];
  const prChip = currentPRs?.weight
    ? { label: formatPRValue('weight', currentPRs.weight.value), title: 'Current weight PR' }
    : currentPRs?.reps
    ? { label: formatPRValue('reps', currentPRs.reps.value), title: 'Current reps PR' }
    : null;

  return (
    <div className="page">
      <div className={styles.container}>
        <header className={styles.topBar}>
          <button type="button" className={styles.backBtn} onClick={() => navigate('/exercises')}>
            <ChevronLeftIcon />
            Exercises
          </button>
          <button
            type="button"
            className={`icon-btn ${styles.favBtn} ${exercise.isFavorite ? styles.favActive : ''}`}
            onClick={() => toggleFavorite(exercise.id)}
            title={exercise.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={exercise.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={!!exercise.isFavorite}
          >
            {exercise.isFavorite ? '★' : '☆'}
          </button>
        </header>

        {actionError && (
          <p className={styles.actionError} role="alert">
            {actionError}
          </p>
        )}

        {/* Title card */}
        <section className={`surface-hero ${styles.hero}`}>
          {(prChip || exercise.isPreset || family) && (
            <div className={styles.heroChips}>
              {prChip && (
                <span className="chip chip-pr" title={prChip.title}>
                  <TrophyIcon /> <span className="num">{prChip.label}</span>
                </span>
              )}
              {family && <span className="chip chip-accent">{family.variants.length} variations</span>}
              {exercise.isPreset && <span className="chip">Preset</span>}
            </div>
          )}
          <h1 className={styles.name}>{family ? family.name : exercise.name}</h1>
          {family && <p className={styles.variantName}>{exercise.name}</p>}

          {/* Wait for the index: without it VariantChips would fall back to creating rows */}
          {family && familyIndex && (
            <div className={styles.variantSection}>
              <VariantChips
                exercise={exercise}
                alwaysExpanded
                existingIndex={familyIndex}
                onChange={(next) => navigate(`/exercises/${next.id}`, { replace: true })}
              />
            </div>
          )}
        </section>

        {/* Info rows */}
        {(muscles.length > 0 || exercise.equipment || exercise.movementPattern || parentExercise) && (
          <section className={`surface ${styles.infoCard}`}>
            {muscles.length > 0 && (
              <div className={`${styles.infoRow} ${styles.infoRowStacked}`}>
                <span className={styles.label}>Muscles</span>
                <div className={styles.tagList}>
                  {muscles.map((mg) => (
                    <span key={mg} className="chip">
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
              <button
                type="button"
                className={`${styles.infoRow} ${styles.infoRowLink}`}
                onClick={() => navigate(`/exercises/${parentExercise.id}`)}
              >
                <span className={styles.label}>Variation of</span>
                <span className={styles.linkValue}>
                  {parentExercise.name}
                  <ChevronRightIcon />
                </span>
              </button>
            )}
          </section>
        )}

        {/* Progression memberships */}
        {progressions.length > 0 && (
          <section className={styles.section}>
            <h2 className="section-title">Progressions</h2>
            <div className={`surface ${styles.listCard}`}>
              {progressions.map((pm) => {
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
                    <span className={styles.levelBadge}>
                      <span className={styles.levelBadgeLabel}>Lv</span>
                      <span className="num">{pm.level}</span>
                    </span>
                    <button
                      type="button"
                      className={styles.progressionLink}
                      onClick={() => navigate(`/progressions/${pm.progressionId}`)}
                      title={`View ${progName} progression`}
                    >
                      {progName}
                    </button>
                    <div className={styles.progressionNav}>
                      {prevId && prevLevel !== undefined && (
                        <button
                          type="button"
                          className={styles.progressionNavBtn}
                          onClick={() => navigate(`/exercises/${prevId}`)}
                          title={`Go to level ${prevLevel}`}
                          aria-label={`Go to level ${prevLevel}`}
                        >
                          ‹ <span className="num">{prevLevel}</span>
                        </button>
                      )}
                      {nextId && nextLevel !== undefined && (
                        <button
                          type="button"
                          className={styles.progressionNavBtn}
                          onClick={() => navigate(`/exercises/${nextId}`)}
                          title={`Go to level ${nextLevel}`}
                          aria-label={`Go to level ${nextLevel}`}
                        >
                          <span className="num">{nextLevel}</span> ›
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Demo image + muscle diagram */}
        <ExerciseImage exerciseName={exercise.name} />

        {muscles.length > 0 && <MuscleHighlighter name={exercise.name} muscleGroups={muscles} />}

        {/* Variations section */}
        {variations && variations.length > 0 && (
          <section className={styles.section}>
            <h2 className="section-title">Variations</h2>
            <div className={`surface ${styles.listCard}`}>
              {variations.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => navigate(`/exercises/${v.id}`)}
                  className={styles.variationItem}
                >
                  <span className={styles.variationName}>{v.name}</span>
                  <ChevronRightIcon />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Custom exercise actions */}
        {!exercise.isPreset && (
          <section className={styles.actions}>
            <div className={styles.actionRow}>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button variant="secondary" onClick={handleDuplicate} disabled={duplicating}>
                {duplicating ? 'Duplicating…' : 'Duplicate'}
              </Button>
            </div>
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete Exercise
            </Button>
          </section>
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

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4" />
    </svg>
  );
}
