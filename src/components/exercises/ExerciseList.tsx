import { memo, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select, Button, Modal } from '../common';
import { formatMuscleGroup, formatLabel } from '../common/format';
import { ExerciseCard, type ProgressionLevelMap } from './ExerciseCard';
import { ExerciseForm, type ExerciseFormData } from './ExerciseForm';
import {
  createExercise,
  toggleFavorite,
  type ExerciseSortOption,
  type FilterMode,
} from '../../hooks/useExercises';
import { useDebouncedValue, useFamilyIndex, useIncrementalList } from '../../hooks/useExerciseFamilies';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import { PROGRESSION_DEFINITIONS } from '../../data/progressions';
import { db } from '../../db';
import {
  buildExerciseEntries,
  filterExerciseEntries,
  type ExerciseListEntry,
} from '../../utils/exerciseFamilies';
import type { Exercise, MuscleGroup } from '../../types';
import styles from './ExerciseList.module.css';
import cardStyles from './ExerciseCard.module.css';

// Max level across all progressions (covers OG2 ranges)
const ALL_LEVELS = Array.from({ length: 17 }, (_, i) => i + 1);

type FamilyEntry = Extract<ExerciseListEntry, { kind: 'family' }>;

function entryLevel(entry: ExerciseListEntry): number | undefined {
  return entry.kind === 'exercise' ? entry.exercise.progressionLevel : undefined;
}

export function ExerciseList() {
  const navigate = useNavigate();
  useScrollRestore();
  const [searchQuery, setSearchQuery] = usePersistedState('exercises.search', '');
  const debouncedSearch = useDebouncedValue(searchQuery, 150);
  const [muscleGroupFilters, setMuscleGroupFilters] = usePersistedState<MuscleGroup[]>('exercises.muscles', []);
  const [filterMode, setFilterMode] = usePersistedState<FilterMode>('exercises.filterMode', 'any');
  const [equipmentFilter, setEquipmentFilter] = usePersistedState('exercises.equipment', '');
  const [movementFilter, setMovementFilter] = usePersistedState('exercises.movement', '');
  const [sortOption, setSortOption] = usePersistedState<ExerciseSortOption>('exercises.sort', 'name-asc');
  const [progressionFilter, setProgressionFilter] = usePersistedState('exercises.progression', '');
  const [selectedLevels, setSelectedLevels] = usePersistedState<number[]>('exercises.levels', []);

  const [showFavoritesOnly, setShowFavoritesOnly] = usePersistedState('exercises.favoritesOnly', false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = usePersistedState('exercises.filtersExpanded', false);
  const [isMuscleFilterExpanded, setIsMuscleFilterExpanded] = usePersistedState('exercises.muscleExpanded', false);
  const [isLevelFilterExpanded, setIsLevelFilterExpanded] = usePersistedState('exercises.levelExpanded', false);

  // One live query for the whole library; everything else is derived in memory
  const { exercises, index } = useFamilyIndex();

  const { muscleGroups, equipment, movements } = useMemo(() => {
    const mg = new Set<MuscleGroup>();
    const eq = new Set<string>();
    const mv = new Set<string>();
    for (const e of exercises ?? []) {
      e.muscleGroups?.forEach((m) => mg.add(m));
      if (e.equipment) eq.add(e.equipment);
      if (e.movementPattern) mv.add(e.movementPattern);
    }
    return { muscleGroups: [...mg].sort(), equipment: [...eq].sort(), movements: [...mv].sort() };
  }, [exercises]);

  const entries = useMemo(
    () => (exercises && index ? buildExerciseEntries(exercises, index) : []),
    [exercises, index],
  );

  const muscleKey = muscleGroupFilters.join(',');
  const levelKey = selectedLevels.join(',');
  const filteredEntries = useMemo(() => {
    const muscles = muscleKey ? (muscleKey.split(',') as MuscleGroup[]) : [];
    const levels = levelKey ? levelKey.split(',').map(Number) : [];
    const hasPredicate =
      muscles.length > 0 || !!equipmentFilter || !!movementFilter || !!progressionFilter || levels.length > 0 || showFavoritesOnly;
    const predicate = hasPredicate
      ? (e: Exercise) => {
          if (muscles.length > 0) {
            const ok =
              filterMode === 'all'
                ? muscles.every((mg) => e.muscleGroups?.includes(mg))
                : muscles.some((mg) => e.muscleGroups?.includes(mg));
            if (!ok) return false;
          }
          if (equipmentFilter && e.equipment !== equipmentFilter) return false;
          if (movementFilter && e.movementPattern !== movementFilter) return false;
          if (progressionFilter && !e.progressionMemberships?.some((pm) => pm.progressionId === progressionFilter)) return false;
          if (levels.length > 0 && (!e.progressionLevel || !levels.includes(e.progressionLevel))) return false;
          if (showFavoritesOnly && !e.isFavorite) return false;
          return true;
        }
      : undefined;

    const result = filterExerciseEntries(entries, debouncedSearch, predicate);
    if (sortOption === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === 'level-asc') {
      result.sort((a, b) => (entryLevel(a) ?? 999) - (entryLevel(b) ?? 999));
    } else if (sortOption === 'level-desc') {
      result.sort((a, b) => (entryLevel(b) ?? 0) - (entryLevel(a) ?? 0));
    }
    return result;
  }, [entries, debouncedSearch, muscleKey, levelKey, filterMode, equipmentFilter, movementFilter, progressionFilter, showFavoritesOnly, sortOption]);

  const listResetKey = `${debouncedSearch}|${muscleKey}|${levelKey}|${filterMode}|${equipmentFilter}|${movementFilter}|${progressionFilter}|${showFavoritesOnly}|${sortOption}`;
  // Render enough cards up front for useScrollRestore to land where the user left off
  const [initialCount] = useState(() => {
    try {
      const y = parseInt(sessionStorage.getItem('scroll:/exercises') ?? '0', 10) || 0;
      return Math.max(40, Math.ceil(y / 60) + 20);
    } catch {
      return 40;
    }
  });
  const { visibleCount, hasMore, sentinelRef } = useIncrementalList(filteredEntries.length, listResetKey, initialCount);

  // Build progressionId → level → exerciseId map for prev/next navigation
  const progressionLevelMap: ProgressionLevelMap = useMemo(() => {
    const map: ProgressionLevelMap = new Map();
    for (const ex of exercises ?? []) {
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
  }, [exercises]);

  const openExercise = useCallback((id: string) => navigate(`/exercises/${id}`), [navigate]);

  // The library never creates variant rows (only the picker does): a family card
  // opens its default variant, else the first existing variant.
  const openFamily = useCallback(
    (entry: FamilyEntry) => {
      if (entry.defaultExercise) navigate(`/exercises/${entry.defaultExercise.id}`);
    },
    [navigate],
  );

  const handleCreate = async (data: ExerciseFormData) => {
    const id = await createExercise(data);
    setIsCreateModalOpen(false);
    navigate(`/exercises/${id}`);
  };

  const handleMuscleGroupToggle = (mg: MuscleGroup) => {
    setMuscleGroupFilters((prev) =>
      prev.includes(mg)
        ? prev.filter((m) => m !== mg)
        : [...prev, mg]
    );
  };

  const handleLevelToggle = (level: number) => {
    setSelectedLevels((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level].sort((a, b) => a - b)
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setMuscleGroupFilters([]);
    setEquipmentFilter('');
    setMovementFilter('');
    setProgressionFilter('');
    setSelectedLevels([]);
    setShowFavoritesOnly(false);
  };

  const hasFilters = searchQuery || muscleGroupFilters.length > 0 || equipmentFilter || movementFilter || progressionFilter || selectedLevels.length > 0 || showFavoritesOnly;

  const activeFilterCount =
    (muscleGroupFilters.length > 0 ? 1 : 0) +
    (equipmentFilter ? 1 : 0) +
    (movementFilter ? 1 : 0) +
    (progressionFilter ? 1 : 0) +
    (selectedLevels.length > 0 ? 1 : 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="page-title">Exercises</h1>
        <Button size="sm" onClick={() => setIsCreateModalOpen(true)} aria-label="New exercise">
          + New
        </Button>
      </header>

      <div className={styles.filters}>
        <Input
          type="search"
          placeholder="Search exercises…"
          aria-label="Search exercises"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />

        <div className={styles.toolbar}>
          <button
            type="button"
            className={`${styles.toolChip} ${isFiltersExpanded || activeFilterCount > 0 ? styles.toolChipOn : ''}`}
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            aria-expanded={isFiltersExpanded}
          >
            <FilterIcon />
            Filters
            {activeFilterCount > 0 && <span className={styles.toolBadge}>{activeFilterCount}</span>}
            <span className={styles.toolChevron} aria-hidden="true">{isFiltersExpanded ? '▴' : '▾'}</span>
          </button>
          <button
            type="button"
            className={`${styles.toolChip} ${showFavoritesOnly ? styles.toolChipFav : ''}`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            aria-pressed={showFavoritesOnly}
          >
            <span aria-hidden="true">{showFavoritesOnly ? '★' : '☆'}</span>
            Favorites
          </button>
          <span className={styles.count}>
            <span className="num">{filteredEntries.length}</span>
          </span>
        </div>

        {isFiltersExpanded && (
          <div className={`surface ${styles.panel}`}>
            <div className={styles.selectGrid}>
              <Select
                label="Sort"
                id="exercise-sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as ExerciseSortOption)}
                options={[
                  { value: 'name-asc', label: 'Name A–Z' },
                  { value: 'name-desc', label: 'Name Z–A' },
                  { value: 'level-asc', label: 'Level ↑' },
                  { value: 'level-desc', label: 'Level ↓' },
                ]}
              />
              <Select
                label="Equipment"
                id="exercise-equipment"
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                options={equipment.map((eq) => ({ value: eq, label: formatLabel(eq) }))}
                placeholder="All"
              />
              <Select
                label="Movement"
                id="exercise-movement"
                value={movementFilter}
                onChange={(e) => setMovementFilter(e.target.value)}
                options={movements.map((m) => ({ value: m, label: formatLabel(m) }))}
                placeholder="All"
              />
              <Select
                label="Progression"
                id="exercise-progression"
                value={progressionFilter}
                onChange={(e) => setProgressionFilter(e.target.value)}
                options={PROGRESSION_DEFINITIONS.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="All"
              />
            </div>

            {/* Muscle Group Multi-Select - Collapsible */}
            <div className={styles.disclosure}>
              <button
                type="button"
                className={styles.disclosureToggle}
                onClick={() => setIsMuscleFilterExpanded(!isMuscleFilterExpanded)}
                aria-expanded={isMuscleFilterExpanded}
              >
                <span className={styles.disclosureLabel}>Muscles</span>
                {muscleGroupFilters.length > 0 && (
                  <span className="chip chip-accent">{muscleGroupFilters.length} selected</span>
                )}
                <span className={styles.toolChevron} aria-hidden="true">{isMuscleFilterExpanded ? '▴' : '▾'}</span>
              </button>

              {isMuscleFilterExpanded && (
                <div className={styles.disclosureBody}>
                  {muscleGroupFilters.length > 1 && (
                    <div className={styles.filterModeRow}>
                      <span className={styles.filterModeLabel}>Match</span>
                      <div className={styles.segmented} role="radiogroup" aria-label="Match muscles">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={filterMode === 'any'}
                          className={`${styles.segment} ${filterMode === 'any' ? styles.segmentActive : ''}`}
                          onClick={() => setFilterMode('any')}
                        >
                          Any
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={filterMode === 'all'}
                          className={`${styles.segment} ${filterMode === 'all' ? styles.segmentActive : ''}`}
                          onClick={() => setFilterMode('all')}
                        >
                          All
                        </button>
                      </div>
                    </div>
                  )}
                  <div className={styles.chipWrap}>
                    {muscleGroups.map((mg) => (
                      <button
                        type="button"
                        key={mg}
                        className={`${styles.filterChip} ${muscleGroupFilters.includes(mg) ? styles.filterChipActive : ''}`}
                        onClick={() => handleMuscleGroupToggle(mg)}
                        aria-pressed={muscleGroupFilters.includes(mg)}
                      >
                        {formatMuscleGroup(mg)}
                      </button>
                    ))}
                  </div>
                  {muscleGroupFilters.length > 0 && (
                    <button type="button" className={styles.clearChipsBtn} onClick={() => setMuscleGroupFilters([])}>
                      Clear muscles
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Level Multi-Select - Collapsible */}
            <div className={styles.disclosure}>
              <button
                type="button"
                className={styles.disclosureToggle}
                onClick={() => setIsLevelFilterExpanded(!isLevelFilterExpanded)}
                aria-expanded={isLevelFilterExpanded}
              >
                <span className={styles.disclosureLabel}>Level</span>
                {selectedLevels.length > 0 && (
                  <span className={`chip chip-accent ${styles.levelSummary}`}>{selectedLevels.join(', ')}</span>
                )}
                <span className={styles.toolChevron} aria-hidden="true">{isLevelFilterExpanded ? '▴' : '▾'}</span>
              </button>

              {isLevelFilterExpanded && (
                <div className={styles.disclosureBody}>
                  <div className={styles.levelChips}>
                    {ALL_LEVELS.map((level) => (
                      <button
                        type="button"
                        key={level}
                        className={`${styles.filterChip} ${styles.levelChip} ${selectedLevels.includes(level) ? styles.filterChipActive : ''}`}
                        onClick={() => handleLevelToggle(level)}
                        aria-pressed={selectedLevels.includes(level)}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  {selectedLevels.length > 0 && (
                    <button type="button" className={styles.clearChipsBtn} onClick={() => setSelectedLevels([])}>
                      Clear levels
                    </button>
                  )}
                </div>
              )}
            </div>

            {hasFilters && (
              <Button variant="secondary" size="sm" onClick={clearFilters} className={styles.clearAll}>
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>

      <div className={styles.list}>
        {filteredEntries.slice(0, visibleCount).map((entry) =>
          entry.kind === 'family' ? (
            <FamilyCard key={entry.key} entry={entry} onOpen={openFamily} />
          ) : (
            <LibraryExerciseCard
              key={entry.key}
              exercise={entry.exercise}
              onOpen={openExercise}
              progressionLevelMap={progressionLevelMap}
            />
          ),
        )}
        {hasMore && <div key={visibleCount} ref={sentinelRef} className={styles.sentinel} />}
        {exercises && filteredEntries.length === 0 && (
          <p className={styles.empty}>
            {hasFilters
              ? 'No exercises match your filters.'
              : 'No exercises yet. Create one to get started.'}
          </p>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="New Exercise"
      >
        <ExerciseForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

function FavoriteButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`${styles.favBtn} ${active ? styles.favActive : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={active ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={active}
    >
      {active ? '★' : '☆'}
    </button>
  );
}

const LibraryExerciseCard = memo(function LibraryExerciseCard({
  exercise,
  onOpen,
  progressionLevelMap,
}: {
  exercise: Exercise;
  onOpen: (id: string) => void;
  progressionLevelMap: ProgressionLevelMap;
}) {
  return (
    <ExerciseCard
      exercise={exercise}
      onClick={() => onOpen(exercise.id)}
      showProgressionNav
      progressionLevelMap={progressionLevelMap}
      headerExtra={<FavoriteButton active={!!exercise.isFavorite} onToggle={() => toggleFavorite(exercise.id)} />}
    />
  );
});

/** Star on a family card: filled if any variant is a favorite. Tapping un-favorites
 *  all favorited variants, or favorites the default (else first existing) variant.
 *  Never creates rows. */
async function toggleFamilyFavorite(entry: FamilyEntry): Promise<void> {
  const favorites = entry.members.filter((m) => m.isFavorite);
  const now = Date.now();
  if (favorites.length > 0) {
    await Promise.all(favorites.map((m) => db.exercises.update(m.id, { isFavorite: false, updatedAt: now })));
    return;
  }
  if (entry.defaultExercise) {
    await db.exercises.update(entry.defaultExercise.id, { isFavorite: true, updatedAt: now });
  }
}

const FamilyCard = memo(function FamilyCard({
  entry,
  onOpen,
}: {
  entry: FamilyEntry;
  onOpen: (entry: FamilyEntry) => void;
}) {
  const ex = entry.defaultExercise;
  const muscles = ex?.muscleGroups ?? [];
  const meta = [ex?.movementPattern].filter(Boolean).map((s) => formatLabel(s!));
  const anyFavorite = entry.members.some((m) => m.isFavorite);
  // No variant rows in the DB yet: nothing to open or star (the picker creates rows)
  const hasRows = !!ex;
  const open = () => onOpen(entry);
  return (
    <div
      className={hasRows ? `${cardStyles.card} ${cardStyles.interactive}` : cardStyles.card}
      onClick={hasRows ? open : undefined}
      role={hasRows ? 'button' : undefined}
      tabIndex={hasRows ? 0 : undefined}
      onKeyDown={
        hasRows
          ? (e) => {
              if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                open();
              }
            }
          : undefined
      }
    >
      <div className={cardStyles.header}>
        <h3 className={cardStyles.name}>{entry.name}</h3>
        {hasRows && <FavoriteButton active={anyFavorite} onToggle={() => void toggleFamilyFavorite(entry)} />}
      </div>
      <div className={cardStyles.meta}>
        <span className={styles.variationChip}>
          <span className="num">{entry.family.variants.length}</span> variations
        </span>
        {meta.length > 0 && <span className={cardStyles.metaText}>{meta.join(' · ')}</span>}
        {muscles.map((mg) => (
          <span key={mg} className={cardStyles.muscleTag}>
            {formatMuscleGroup(mg)}
          </span>
        ))}
      </div>
    </div>
  );
});
