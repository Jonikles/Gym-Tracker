import { memo, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select, Button, Modal, Card } from '../common';
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
  getOrCreateVariantExercise,
  type ExerciseListEntry,
} from '../../utils/exerciseFamilies';
import type { Exercise, MuscleGroup } from '../../types';
import styles from './ExerciseList.module.css';

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

  const openFamily = useCallback(
    async (entry: FamilyEntry) => {
      const target = entry.defaultExercise ?? (await getOrCreateVariantExercise(entry.family, entry.family.defaults));
      if (target) navigate(`/exercises/${target.id}`);
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Exercise Library</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          New Exercise
        </Button>
      </header>

      <div className={styles.filters}>
        <div className={styles.searchRow}>
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <Select
            label="Sort by"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as ExerciseSortOption)}
            options={[
              { value: 'name-asc', label: 'Name A-Z' },
              { value: 'name-desc', label: 'Name Z-A' },
              { value: 'level-asc', label: 'Level Low\u2192High' },
              { value: 'level-desc', label: 'Level High\u2192Low' },
            ]}
          />
        </div>

        <button
          className={styles.chipFilterToggle}
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
        >
          <span className={styles.chipFilterLabel}>
            Filters{hasFilters ? ' (active)' : ''}
          </span>
          <span className={styles.chevron}>{isFiltersExpanded ? '▲' : '▼'}</span>
        </button>

        {isFiltersExpanded && (
          <>
        <div className={styles.filterRow}>
          <Select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            options={equipment.map((eq) => ({ value: eq, label: formatLabel(eq) }))}
            placeholder="All equipment"
          />
          <Select
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value)}
            options={movements.map((m) => ({ value: m, label: formatLabel(m) }))}
            placeholder="All movements"
          />
          <Select
            value={progressionFilter}
            onChange={(e) => setProgressionFilter(e.target.value)}
            options={PROGRESSION_DEFINITIONS.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="All progressions"
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {/* Muscle Group Multi-Select - Collapsible */}
        <div className={styles.chipFilterSection}>
          <button
            className={styles.chipFilterToggle}
            onClick={() => setIsMuscleFilterExpanded(!isMuscleFilterExpanded)}
          >
            <span className={styles.chipFilterLabel}>
              Muscles{muscleGroupFilters.length > 0 ? `: ${muscleGroupFilters.length} selected` : ''}
            </span>
            <span className={styles.chevron}>{isMuscleFilterExpanded ? '\u25B2' : '\u25BC'}</span>
          </button>

          {isMuscleFilterExpanded && (
            <div className={styles.chipFilterDropdown}>
              {muscleGroupFilters.length > 1 && (
                <div className={styles.filterModeRow}>
                  <span className={styles.filterModeLabel}>Match:</span>
                  <div className={styles.filterModeToggle}>
                    <button
                      className={`${styles.modeButton} ${filterMode === 'any' ? styles.modeActive : ''}`}
                      onClick={() => setFilterMode('any')}
                    >
                      ANY
                    </button>
                    <button
                      className={`${styles.modeButton} ${filterMode === 'all' ? styles.modeActive : ''}`}
                      onClick={() => setFilterMode('all')}
                    >
                      ALL
                    </button>
                  </div>
                </div>
              )}
              <div className={styles.muscleChips}>
                {muscleGroups.map((mg) => (
                  <button
                    key={mg}
                    className={`${styles.muscleChip} ${muscleGroupFilters.includes(mg) ? styles.muscleChipActive : ''}`}
                    onClick={() => handleMuscleGroupToggle(mg)}
                  >
                    {formatMuscleGroup(mg)}
                  </button>
                ))}
              </div>
              {muscleGroupFilters.length > 0 && (
                <button
                  className={styles.clearChipsBtn}
                  onClick={() => setMuscleGroupFilters([])}
                >
                  Clear muscle filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Level Multi-Select - Collapsible */}
        <div className={styles.chipFilterSection}>
          <button
            className={styles.chipFilterToggle}
            onClick={() => setIsLevelFilterExpanded(!isLevelFilterExpanded)}
          >
            <span className={styles.chipFilterLabel}>
              Level{selectedLevels.length > 0 ? `: ${selectedLevels.join(', ')}` : ''}
            </span>
            <span className={styles.chevron}>{isLevelFilterExpanded ? '\u25B2' : '\u25BC'}</span>
          </button>

          {isLevelFilterExpanded && (
            <div className={styles.chipFilterDropdown}>
              <div className={styles.levelChips}>
                {ALL_LEVELS.map((level) => (
                  <button
                    key={level}
                    className={`${styles.levelChip} ${selectedLevels.includes(level) ? styles.muscleChipActive : ''}`}
                    onClick={() => handleLevelToggle(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
              {selectedLevels.length > 0 && (
                <button
                  className={styles.clearChipsBtn}
                  onClick={() => setSelectedLevels([])}
                >
                  Clear level filters
                </button>
              )}
            </div>
          )}
        </div>
          </>
        )}
      </div>

      <div className={styles.toggleRow}>
        <button
          className={`${styles.favFilterBtn} ${showFavoritesOnly ? styles.favFilterActive : ''}`}
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          {showFavoritesOnly ? '★ Favorites' : '☆ Favorites'}
        </button>
        <span className={styles.count}>{filteredEntries.length} exercises</span>
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
 *  all favorited variants, or favorites the default variant. */
async function toggleFamilyFavorite(entry: FamilyEntry): Promise<void> {
  const favorites = entry.members.filter((m) => m.isFavorite);
  const now = Date.now();
  if (favorites.length > 0) {
    await Promise.all(favorites.map((m) => db.exercises.update(m.id, { isFavorite: false, updatedAt: now })));
    return;
  }
  const target = entry.defaultExercise ?? (await getOrCreateVariantExercise(entry.family, entry.family.defaults));
  if (target) await db.exercises.update(target.id, { isFavorite: true, updatedAt: now });
}

const FamilyCard = memo(function FamilyCard({
  entry,
  onOpen,
}: {
  entry: FamilyEntry;
  onOpen: (entry: FamilyEntry) => void;
}) {
  const muscles = entry.defaultExercise?.muscleGroups ?? [];
  const anyFavorite = entry.members.some((m) => m.isFavorite);
  return (
    <Card onClick={() => onOpen(entry)} interactive>
      <div className={styles.familyHeader}>
        <h3 className={styles.familyName}>{entry.name}</h3>
        <span className={styles.variationCount}>{entry.family.variants.length} variations</span>
        <FavoriteButton active={anyFavorite} onToggle={() => void toggleFamilyFavorite(entry)} />
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
  );
});
