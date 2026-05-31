import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select, Button, Modal } from '../common';
import { ExerciseCard, type ProgressionLevelMap } from './ExerciseCard';
import { ExerciseForm, type ExerciseFormData } from './ExerciseForm';
import {
  useExercises,
  useUniqueMuscleGroups,
  useUniqueEquipment,
  useUniqueMovementPatterns,
  createExercise,
  toggleFavorite,
  type ExerciseFilters,
  type ExerciseSortOption,
  type FilterMode,
} from '../../hooks/useExercises';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import { PROGRESSION_DEFINITIONS } from '../../data/progressions';
import type { MuscleGroup } from '../../types';
import styles from './ExerciseList.module.css';

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

// Max level across all progressions (covers OG2 ranges)
const ALL_LEVELS = Array.from({ length: 17 }, (_, i) => i + 1);

export function ExerciseList() {
  const navigate = useNavigate();
  useScrollRestore();
  const [searchQuery, setSearchQuery] = usePersistedState('exercises.search', '');
  const [muscleGroupFilters, setMuscleGroupFilters] = usePersistedState<MuscleGroup[]>('exercises.muscles', []);
  const [filterMode, setFilterMode] = usePersistedState<FilterMode>('exercises.filterMode', 'any');
  const [equipmentFilter, setEquipmentFilter] = usePersistedState('exercises.equipment', '');
  const [movementFilter, setMovementFilter] = usePersistedState('exercises.movement', '');
  const [sortOption, setSortOption] = usePersistedState<ExerciseSortOption>('exercises.sort', 'name-asc');
  const [showArchived, setShowArchived] = usePersistedState('exercises.archived', false);
  const [progressionFilter, setProgressionFilter] = usePersistedState('exercises.progression', '');
  const [selectedLevels, setSelectedLevels] = usePersistedState<number[]>('exercises.levels', []);

  const [showFavoritesOnly, setShowFavoritesOnly] = usePersistedState('exercises.favoritesOnly', false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMuscleFilterExpanded, setIsMuscleFilterExpanded] = usePersistedState('exercises.muscleExpanded', false);
  const [isLevelFilterExpanded, setIsLevelFilterExpanded] = usePersistedState('exercises.levelExpanded', false);

  const filters: ExerciseFilters = {
    searchQuery,
    muscleGroups: muscleGroupFilters.length > 0 ? muscleGroupFilters : undefined,
    filterMode,
    equipment: equipmentFilter || undefined,
    movementPattern: movementFilter || undefined,
    includeArchived: showArchived,
    sort: sortOption,
    progressionId: progressionFilter || undefined,
  };

  const exercises = useExercises(filters);
  const allExercises = useExercises({}); // Unfiltered — used for progression level lookups
  const filteredExercises = exercises.filter((e) => {
    if (showFavoritesOnly && !e.isFavorite) return false;
    if (selectedLevels.length > 0) {
      if (!e.progressionLevel) return false;
      if (!selectedLevels.includes(e.progressionLevel)) return false;
    }
    return true;
  });
  const muscleGroups = useUniqueMuscleGroups() ?? [];
  const equipment = useUniqueEquipment() ?? [];
  const movements = useUniqueMovementPatterns() ?? [];

  // Build progressionId → level → exerciseId map for prev/next navigation
  const progressionLevelMap: ProgressionLevelMap = useMemo(() => {
    const map: ProgressionLevelMap = new Map();
    for (const ex of allExercises) {
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
  }, [allExercises]);

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
      </div>

      <div className={styles.toggleRow}>
        <button
          className={`${styles.favFilterBtn} ${showFavoritesOnly ? styles.favFilterActive : ''}`}
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          {showFavoritesOnly ? '★ Favorites' : '☆ Favorites'}
        </button>
        <label className={styles.toggle}>
          <input className={styles.toggleInput}
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          <span>Show archived</span>
        </label>
        <span className={styles.count}>{filteredExercises.length} exercises</span>
      </div>

      <div className={styles.list}>
        {filteredExercises.map((exercise) => (
            <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onClick={() => navigate(`/exercises/${exercise.id}`)}
                showProgressionNav
                progressionLevelMap={progressionLevelMap}
                headerExtra={
                  <button
                    className={`${styles.favBtn} ${exercise.isFavorite ? styles.favActive : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(exercise.id); }}
                    title={exercise.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {exercise.isFavorite ? '★' : '☆'}
                  </button>
                }
            />
        ))}
        {filteredExercises.length === 0 && (
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
