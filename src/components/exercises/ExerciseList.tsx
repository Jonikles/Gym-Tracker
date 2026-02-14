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

export function ExerciseList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleGroupFilters, setMuscleGroupFilters] = useState<MuscleGroup[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('any');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [movementFilter, setMovementFilter] = useState('');
  const [sortOption, setSortOption] = useState<ExerciseSortOption>('name-asc');
  const [showArchived, setShowArchived] = useState(false);
  const [showProgressionOnly, setShowProgressionOnly] = useState(false);
  const [minLevel, setMinLevel] = useState<number | ''>('');
  const [maxLevel, setMaxLevel] = useState<number | ''>('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMuscleFilterExpanded, setIsMuscleFilterExpanded] = useState(false);

  const filters: ExerciseFilters = {
    searchQuery,
    muscleGroups: muscleGroupFilters.length > 0 ? muscleGroupFilters : undefined,
    filterMode,
    equipment: equipmentFilter || undefined,
    movementPattern: movementFilter || undefined,
    includeArchived: showArchived,
    sort: sortOption,
    
  };

  const exercises = useExercises(filters);
    const filteredExercises = exercises.filter((e) => {
        if (showProgressionOnly && !e.progressionLevel) return false;
        if (minLevel !== '' && (!e.progressionLevel || e.progressionLevel < minLevel)) return false;
        if (maxLevel !== '' && (!e.progressionLevel || e.progressionLevel > maxLevel)) return false;
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

  const clearFilters = () => {
    setSearchQuery('');
    setMuscleGroupFilters([]);
    setEquipmentFilter('');
    setMovementFilter('');
    setShowProgressionOnly(false);
    setMinLevel('');
    setMaxLevel('');
  };

    const hasFilters = searchQuery || muscleGroupFilters.length > 0 || equipmentFilter || movementFilter || showProgressionOnly || minLevel || maxLevel;

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
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as ExerciseSortOption)}
          options={[
            { value: 'name-asc', label: 'Name A-Z' },
            { value: 'name-desc', label: 'Name Z-A' },
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
          <span className={styles.chevron}>{isMuscleFilterExpanded ? '▲' : '▼'}</span>
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
                      {/* Progression Level Filter */}
                      <div className={styles.progressionFilter}>
                          <label className={styles.toggle}>
                              <input
                                  className={styles.toggleInput}
                                  type="checkbox"
                                  checked={showProgressionOnly}
                                  onChange={(e) => setShowProgressionOnly(e.target.checked)}
                              />
                              <span>Progression exercises only</span>
                          </label>
                          {showProgressionOnly && (
                              <Select
                                  value={minLevel !== '' && maxLevel !== '' ? `${minLevel}-${maxLevel}` : ''}
                                  onChange={(e) => {
                                      if (e.target.value === '') {
                                          setMinLevel('');
                                          setMaxLevel('');
                                      } else {
                                          const [min, max] = e.target.value.split('-').map(Number);
                                          setMinLevel(min);
                                          setMaxLevel(max);
                                      }
                                  }}
                                  options={[
                                      { value: '1-3', label: 'Beginner (1-3)' },
                                      { value: '4-6', label: 'Intermediate (4-6)' },
                                      { value: '7-9', label: 'Advanced (7-9)' },
                                      { value: '10-16', label: 'Elite (10+)' },
                                  ]}
                                  placeholder="All levels"
                              />
                          )}
                      </div>
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
