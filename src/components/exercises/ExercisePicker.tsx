import { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Input, Select, Button } from '../common';
import { ExerciseCard } from './ExerciseCard';
import {
  useExercises,
  useUniqueMuscleGroups,
  useUniqueEquipment,
  useFavoriteExercises,
  useRecentExercises,
  toggleFavorite,
  type ExerciseFilters,
} from '../../hooks/useExercises';
import type { Exercise, MuscleGroup } from '../../types';
import styles from './ExercisePicker.module.css';

type PickerTab = 'all' | 'favorites' | 'recent';

interface ExercisePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  title?: string;
  excludeIds?: string[];
}

export function ExercisePicker({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Exercise',
  excludeIds = [],
}: ExercisePickerProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<MuscleGroup | ''>('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // When search query is typed, switch to "all" tab automatically
  useEffect(() => {
    if (searchQuery && activeTab !== 'all') {
      setActiveTab('all');
    }
  }, [searchQuery, activeTab]);

  const filters: ExerciseFilters = {
    searchQuery,
    muscleGroups: muscleGroupFilter ? [muscleGroupFilter] : undefined,
    equipment: equipmentFilter || undefined,
  };

  const allExercises = useExercises(filters);
  const favoriteExercises = useFavoriteExercises() ?? [];
  const recentExercises = useRecentExercises(15) ?? [];
  const muscleGroups = useUniqueMuscleGroups() ?? [];
  const equipment = useUniqueEquipment() ?? [];

  // Determine which list to show
  let displayExercises: Exercise[];
  if (activeTab === 'favorites') {
    displayExercises = favoriteExercises;
  } else if (activeTab === 'recent') {
    displayExercises = recentExercises;
  } else {
    displayExercises = allExercises.filter((e) => !excludeIds.includes(e.id));
  }
  // For favorites/recent tabs we keep all exercises visible (excluded ones shown as disabled)

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    onClose();
    setSearchQuery('');
    setMuscleGroupFilter('');
    setEquipmentFilter('');
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setMuscleGroupFilter('');
    setEquipmentFilter('');
    setActiveTab('all');
  };

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, exerciseId: string) => {
    e.stopPropagation();
    await toggleFavorite(exerciseId);
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className={styles.container}>
        {/* Tab bar */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'favorites' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites{favoriteExercises.length > 0 ? ` (${favoriteExercises.length})` : ''}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'recent' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            Recent
          </button>
        </div>

        {/* Search + filters (only for "all" tab) */}
        <div className={styles.filters}>
          <Input
            ref={searchRef}
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {activeTab === 'all' && (
            <div className={styles.filterRow}>
              <Select
                value={muscleGroupFilter}
                onChange={(e) => setMuscleGroupFilter(e.target.value as MuscleGroup | '')}
                options={muscleGroups.map((mg) => ({ value: mg, label: mg.replace(/-/g, ' ') }))}
                placeholder="All muscles"
              />
              <Select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                options={equipment.map((eq) => ({ value: eq, label: eq }))}
                placeholder="All equipment"
              />
            </div>
          )}
        </div>

        <div className={styles.list}>
          {displayExercises.map((exercise) => {
            const isExcluded = excludeIds.includes(exercise.id);
            return (
              <div key={exercise.id} className={`${styles.exerciseRow} ${isExcluded ? styles.exerciseRowDisabled : ''}`}>
                <button
                  className={`${styles.favBtn} ${exercise.isFavorite ? styles.favActive : ''}`}
                  onClick={(e) => handleToggleFavorite(e, exercise.id)}
                  title={exercise.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {exercise.isFavorite ? '★' : '☆'}
                </button>
                <ExerciseCard
                  exercise={exercise}
                  onClick={isExcluded ? undefined : () => handleSelect(exercise)}
                  showDetails
                />
                {isExcluded && <span className={styles.addedLabel}>Added</span>}
              </div>
            );
          })}
          {displayExercises.length === 0 && (
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
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
