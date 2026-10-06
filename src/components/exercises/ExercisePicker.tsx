import { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Modal, Input, Select, Button, Card } from '../common';
import { formatLabel, formatMuscleGroup } from '../common/format';
import { ExerciseCard } from './ExerciseCard';
import { FamilyParamSelector } from './VariantChips';
import { useRecentExercises, toggleFavorite } from '../../hooks/useExercises';
import { useDebouncedValue, useFamilyIndex, useIncrementalList } from '../../hooks/useExerciseFamilies';
import { resolveVariant, type ExerciseFamily } from '../../data/exercise-families';
import {
  buildExerciseEntries,
  filterExerciseEntries,
  getOrCreateVariantExercise,
  getVariantExercise,
  paramsForQuery,
  type ExerciseListEntry,
  type FamilyIndex,
} from '../../utils/exerciseFamilies';
import type { Exercise, MuscleGroup } from '../../types';
import styles from './ExercisePicker.module.css';

type PickerTab = 'all' | 'favorites' | 'recent';

interface ExercisePickerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Always called with a CONCRETE exercise (family parameters already resolved) */
  onSelect: (exercise: Exercise) => void;
  title?: string;
  excludeIds?: string[];
}

const EMPTY_IDS: string[] = [];

export function ExercisePicker({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Exercise',
  excludeIds = EMPTY_IDS,
}: ExercisePickerProps) {
  // Content (and its DB queries) only mounts while open; unmounting resets its state
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {isOpen && <PickerContent onClose={onClose} onSelect={onSelect} excludeIds={excludeIds} />}
    </Modal>
  );
}

interface FamilyStep {
  family: ExerciseFamily;
  params: Record<string, string>;
}

function PickerContent({
  onClose,
  onSelect,
  excludeIds,
}: {
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  excludeIds: string[];
}) {
  const [activeTab, setActiveTab] = useState<PickerTab>('all');
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebouncedValue(searchInput, 150);
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<MuscleGroup | ''>('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [step, setStep] = useState<FamilyStep | null>(null);
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus search input when opened
  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const { exercises, index } = useFamilyIndex();
  const recentExercises = useRecentExercises(15);

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const favoriteExercises = useMemo(
    () => (exercises ?? []).filter((e) => e.isFavorite).sort((a, b) => a.name.localeCompare(b.name)),
    [exercises],
  );

  const { muscleGroups, equipment } = useMemo(() => {
    const mg = new Set<MuscleGroup>();
    const eq = new Set<string>();
    for (const e of exercises ?? []) {
      e.muscleGroups?.forEach((m) => mg.add(m));
      if (e.equipment) eq.add(e.equipment);
    }
    return { muscleGroups: [...mg].sort(), equipment: [...eq].sort() };
  }, [exercises]);

  const entries = useMemo(
    () => (exercises && index ? buildExerciseEntries(exercises, index) : []),
    [exercises, index],
  );

  const filteredEntries = useMemo(() => {
    const predicate =
      muscleGroupFilter || equipmentFilter
        ? (e: Exercise) =>
            (!muscleGroupFilter || !!e.muscleGroups?.includes(muscleGroupFilter)) &&
            (!equipmentFilter || e.equipment === equipmentFilter)
        : undefined;
    return filterExerciseEntries(entries, searchQuery, predicate).filter(
      (entry) => entry.kind === 'family' || !excludeSet.has(entry.exercise.id),
    );
  }, [entries, searchQuery, muscleGroupFilter, equipmentFilter, excludeSet]);

  const listResetKey = `${activeTab}|${searchQuery}|${muscleGroupFilter}|${equipmentFilter}`;
  const { visibleCount, hasMore, sentinelRef } = useIncrementalList(filteredEntries.length, listResetKey);

  // Scroll the list back to the top when the result set changes
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [listResetKey]);

  const handlePickExercise = useCallback(
    (exercise: Exercise) => {
      onSelect(exercise);
      onClose();
    },
    [onSelect, onClose],
  );

  const handlePickFamily = useCallback(
    (family: ExerciseFamily) => {
      setStep({ family, params: paramsForQuery(family, searchQuery) });
    },
    [searchQuery],
  );

  const handleToggleFavorite = useCallback(async (exerciseId: string) => {
    await toggleFavorite(exerciseId);
  }, []);

  const handleConfirmFamily = async () => {
    if (!step || adding) return;
    setAdding(true);
    try {
      const concrete = await getOrCreateVariantExercise(step.family, step.params);
      if (concrete) handlePickExercise(concrete);
    } finally {
      setAdding(false);
    }
  };

  if (step && index) {
    return (
      <FamilyParamStep
        step={step}
        index={index}
        excludeSet={excludeSet}
        adding={adding}
        onChangeParams={(params) => setStep({ ...step, params })}
        onBack={() => setStep(null)}
        onConfirm={handleConfirmFamily}
        onCancel={onClose}
      />
    );
  }

  const concreteList = activeTab === 'favorites' ? favoriteExercises : activeTab === 'recent' ? recentExercises ?? [] : null;
  const loading = !exercises || (activeTab === 'recent' && !recentExercises);

  return (
    <div className={styles.container}>
      {/* Tab bar */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'favorites' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          Favorites{favoriteExercises.length > 0 ? ` (${favoriteExercises.length})` : ''}
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'recent' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          Recent
        </button>
      </div>

      {/* Search + filters */}
      <div className={styles.filters}>
        <Input
          ref={searchRef}
          placeholder="Search exercises..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            // Typing a search always searches the full list
            if (e.target.value && activeTab !== 'all') setActiveTab('all');
          }}
        />
        {activeTab === 'all' && (
          <div className={styles.filterRow}>
            <Select
              value={muscleGroupFilter}
              onChange={(e) => setMuscleGroupFilter(e.target.value as MuscleGroup | '')}
              options={muscleGroups.map((mg) => ({ value: mg, label: formatMuscleGroup(mg) }))}
              placeholder="All muscles"
            />
            <Select
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              options={equipment.map((eq) => ({ value: eq, label: formatLabel(eq) }))}
              placeholder="All equipment"
            />
          </div>
        )}
      </div>

      <div className={styles.list} ref={listRef}>
        {concreteList
          ? concreteList.map((exercise) => (
              <PickerExerciseRow
                key={exercise.id}
                exercise={exercise}
                isExcluded={excludeSet.has(exercise.id)}
                onPick={handlePickExercise}
                onToggleFavorite={handleToggleFavorite}
              />
            ))
          : filteredEntries.slice(0, visibleCount).map((entry) =>
              entry.kind === 'family' ? (
                <PickerFamilyRow key={entry.key} entry={entry} onPick={handlePickFamily} />
              ) : (
                <PickerExerciseRow
                  key={entry.key}
                  exercise={entry.exercise}
                  isExcluded={false}
                  onPick={handlePickExercise}
                  onToggleFavorite={handleToggleFavorite}
                />
              ),
            )}
        {!concreteList && hasMore && <div key={visibleCount} ref={sentinelRef} className={styles.sentinel} />}
        {!loading && (concreteList ?? filteredEntries).length === 0 && (
          <p className={styles.empty}>
            {activeTab === 'favorites'
              ? 'No favorites yet. Star exercises to add them here.'
              : activeTab === 'recent'
              ? 'No recent exercises. Complete a workout to see them here.'
              : 'No exercises found.'}
          </p>
        )}
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

const PickerExerciseRow = memo(function PickerExerciseRow({
  exercise,
  isExcluded,
  onPick,
  onToggleFavorite,
}: {
  exercise: Exercise;
  isExcluded: boolean;
  onPick: (exercise: Exercise) => void;
  onToggleFavorite: (exerciseId: string) => void;
}) {
  return (
    <div className={`${styles.exerciseRow} ${isExcluded ? styles.exerciseRowDisabled : ''}`}>
      <button
        type="button"
        className={`${styles.favBtn} ${exercise.isFavorite ? styles.favActive : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(exercise.id);
        }}
        title={exercise.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={exercise.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {exercise.isFavorite ? '★' : '☆'}
      </button>
      <ExerciseCard exercise={exercise} onClick={isExcluded ? undefined : () => onPick(exercise)} showDetails />
      {isExcluded && <span className={styles.addedLabel}>Added</span>}
    </div>
  );
});

const PickerFamilyRow = memo(function PickerFamilyRow({
  entry,
  onPick,
}: {
  entry: Extract<ExerciseListEntry, { kind: 'family' }>;
  onPick: (family: ExerciseFamily) => void;
}) {
  const muscles = entry.defaultExercise?.muscleGroups ?? [];
  const anyFavorite = entry.members.some((m) => m.isFavorite);
  return (
    <div className={styles.exerciseRow}>
      <span className={`${styles.favBtn} ${styles.favIndicator} ${anyFavorite ? styles.favActive : ''}`} aria-hidden="true">
        {anyFavorite ? '★' : ''}
      </span>
      <Card onClick={() => onPick(entry.family)} interactive>
        <div className={styles.familyHeader}>
          <h3 className={styles.familyName}>{entry.name}</h3>
          <span className={styles.variationCount}>
            {entry.family.variants.length} variations ›
          </span>
        </div>
        {muscles.length > 0 && (
          <div className={styles.muscleRow}>
            {muscles.map((mg) => (
              <span key={mg} className={styles.muscleTag}>
                {formatMuscleGroup(mg)}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Parameter step
// ---------------------------------------------------------------------------

function FamilyParamStep({
  step,
  index,
  excludeSet,
  adding,
  onChangeParams,
  onBack,
  onConfirm,
  onCancel,
}: {
  step: FamilyStep;
  index: FamilyIndex;
  excludeSet: Set<string>;
  adding: boolean;
  onChangeParams: (params: Record<string, string>) => void;
  onBack: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { family, params } = step;
  const variant = resolveVariant(family, params);
  const existing = getVariantExercise(index, family, params);
  const alreadyAdded = !!existing && excludeSet.has(existing.id);
  const muscles = existing?.muscleGroups ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.stepHeader}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Back
        </button>
        <h3 className={styles.stepTitle}>{family.name}</h3>
      </div>

      <div className={styles.stepBody}>
        <FamilyParamSelector family={family} params={params} onChange={onChangeParams} />

        <div className={styles.resolved}>
          <span className={styles.resolvedName}>→ {variant?.exerciseName ?? 'Pick a combination'}</span>
          {muscles.length > 0 && (
            <div className={styles.muscleRow}>
              {muscles.map((mg) => (
                <span key={mg} className={styles.muscleTag}>
                  {formatMuscleGroup(mg)}
                </span>
              ))}
            </div>
          )}
          {alreadyAdded && <span className={styles.alreadyAdded}>Already added</span>}
        </div>
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!variant || alreadyAdded || adding}>
          {adding ? 'Adding…' : 'Add'}
        </Button>
      </div>
    </div>
  );
}
