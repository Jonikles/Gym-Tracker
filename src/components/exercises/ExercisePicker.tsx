import { useState } from 'react';
import { Modal, Input, Select, Button } from '../common';
import { ExerciseCard } from './ExerciseCard';
import {
  useExercises,
  useUniqueMuscleGroups,
  useUniqueEquipment,
  type ExerciseFilters,
} from '../../hooks/useExercises';
import type { Exercise, MuscleGroup } from '../../types';
import styles from './ExercisePicker.module.css';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<MuscleGroup | ''>('');
  const [equipmentFilter, setEquipmentFilter] = useState('');

  const filters: ExerciseFilters = {
    searchQuery,
    muscleGroups: muscleGroupFilter ? [muscleGroupFilter] : undefined,
    equipment: equipmentFilter || undefined,
  };

  const allExercises = useExercises(filters);
  const exercises = allExercises.filter((e) => !excludeIds.includes(e.id));
  const muscleGroups = useUniqueMuscleGroups() ?? [];
  const equipment = useUniqueEquipment() ?? [];

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    onClose();
    // Reset filters after selection
    setSearchQuery('');
    setMuscleGroupFilter('');
    setEquipmentFilter('');
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setMuscleGroupFilter('');
    setEquipmentFilter('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className={styles.container}>
        <div className={styles.filters}>
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
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
        </div>

        <div className={styles.list}>
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onClick={() => handleSelect(exercise)}
              showDetails
            />
          ))}
          {exercises.length === 0 && (
            <p className={styles.empty}>No exercises found.</p>
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
