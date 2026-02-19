import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select, Button, Modal } from '../common';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseForm, type ExerciseFormData } from './ExerciseForm';
import {
  useExercises,
  useUniqueMuscleGroups,
  useUniqueEquipment,
  useUniqueMovementPatterns,
  createExercise,
  type ExerciseFilters,
  type ExerciseSortOption,
  type FilterMode,
} from '../../hooks/useExercises';
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
const ALL_LEVELS = Array.from({ length: 16 }, (_, i) => i + 1);

export function ExerciseList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleGroupFilters, setMuscleGroupFilters] = useState<MuscleGroup[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('any');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [movementFilter, setMovementFilter] = useState('');
  const [sortOption, setSortOption] = useState<ExerciseSortOption>('name-asc');
  const [showArchived, setShowArchived] = useState(false);
  const [progressionFilter, setProgressionFilter] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMuscleFilterExpanded, setIsMuscleFilterExpanded] = useState(false);
  const [isLevelFilterExpanded, setIsLevelFilterExpanded] = useState(false);

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
  const filteredExercises = exercises.filter((e) => {
    if (selectedLevels.length > 0) {
      if (!e.progressionLevel) return false;
      if (!selectedLevels.includes(e.progressionLevel)) return false;
    }
    return true;
  });
  const muscleGroups = useUniqueMuscleGroups() ?? [];
  const equipment = useUniqueEquipment() ?? [];
  const movements = useUniqueMovementPatterns() ?? [];

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
  };

  const hasFilters = searchQuery || muscleGroupFilters.length > 0 || equipmentFilter || movementFilter || progressionFilter || selectedLevels.length > 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Exercise Library</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          New Exercise
        </Button>
      </header>

      <div className={styles.filters}>
        <Input
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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
        <Select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as ExerciseSortOption)}
          options={[
            { value: 'name-asc', label: 'Name A-Z' },
            { value: 'name-desc', label: 'Name Z-A' },
            { value: 'level-asc', label: 'Level Low\u2192High' },
            { value: 'level-desc', label: 'Level High\u2192Low' },
          ]}
          placeholder="Sort by"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Muscle Group Multi-Select - Collapsible */}
      <div className={styles.muscleFilterSection}>
        <button
          className={styles.muscleFilterToggle}
          onClick={() => setIsMuscleFilterExpanded(!isMuscleFilterExpanded)}
        >
          <span className={styles.muscleFilterLabel}>
            Muscles: {muscleGroupFilters.length > 0 ? `${muscleGroupFilters.length} selected` : 'All'}
          </span>
          <span className={styles.chevron}>{isMuscleFilterExpanded ? '\u25B2' : '\u25BC'}</span>
        </button>

        {isMuscleFilterExpanded && (
          <div className={styles.muscleFilterDropdown}>
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
                className={styles.clearMusclesBtn}
                onClick={() => setMuscleGroupFilters([])}
              >
                Clear muscle filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Level Multi-Select - Collapsible */}
      <div className={styles.muscleFilterSection}>
        <button
          className={styles.muscleFilterToggle}
          onClick={() => setIsLevelFilterExpanded(!isLevelFilterExpanded)}
        >
          <span className={styles.muscleFilterLabel}>
            Level: {selectedLevels.length > 0 ? selectedLevels.join(', ') : 'All'}
          </span>
          <span className={styles.chevron}>{isLevelFilterExpanded ? '\u25B2' : '\u25BC'}</span>
        </button>

        {isLevelFilterExpanded && (
          <div className={styles.muscleFilterDropdown}>
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
                className={styles.clearMusclesBtn}
                onClick={() => setSelectedLevels([])}
              >
                Clear level filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className={styles.toggleRow}>
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
