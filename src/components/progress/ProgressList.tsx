import { useNavigate } from 'react-router-dom';
import { Input, Select, Card } from '../common';
import { StrengthStandards } from './StrengthStandards';
import { useExercisesWithHistory } from '../../hooks/useAnalytics';
import { useUniqueMuscleGroups, useUniqueEquipment } from '../../hooks/useExercises';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import type { Exercise, MuscleGroup } from '../../types';
import styles from './ProgressList.module.css';

interface ExerciseItemProps {
  exercise: Exercise;
  sessionCount: number;
  onClick: () => void;
}

// Format muscle group for display
function formatMuscleGroup(mg: MuscleGroup): string {
  return mg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ExerciseItem({ exercise, sessionCount, onClick }: ExerciseItemProps) {
  return (
    <Card onClick={onClick} interactive>
      <div className={styles.exerciseItem}>
        <div className={styles.exerciseInfo}>
          <span className={styles.exerciseName}>{exercise.name}</span>
          <span className={styles.exerciseMeta}>
            {exercise.equipment}
            {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
              <> · {exercise.muscleGroups.slice(0, 2).map(formatMuscleGroup).join(', ')}</>
            )}
          </span>
        </div>
        <div className={styles.sessionCount}>
          {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
        </div>
      </div>
    </Card>
  );
}

export function ProgressList() {
  const navigate = useNavigate();
  useScrollRestore();
  const exercisesWithHistory = useExercisesWithHistory() ?? [];
  const [searchQuery, setSearchQuery] = usePersistedState('progress.search', '');
  const [muscleFilter, setMuscleFilter] = usePersistedState<MuscleGroup | ''>('progress.muscle', '');
  const [equipmentFilter, setEquipmentFilter] = usePersistedState('progress.equipment', '');

  const muscleGroups = useUniqueMuscleGroups() ?? [];
  const equipment = useUniqueEquipment() ?? [];

  const filteredExercises = exercisesWithHistory.filter(({ exercise }) => {
    if (searchQuery && !exercise.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (muscleFilter && !exercise.muscleGroups?.includes(muscleFilter)) {
      return false;
    }
    if (equipmentFilter && exercise.equipment !== equipmentFilter) {
      return false;
    }
    return true;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setMuscleFilter('');
    setEquipmentFilter('');
  };

  const hasFilters = searchQuery || muscleFilter || equipmentFilter;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Progress</h1>
      </header>

      <StrengthStandards />

      <h2 className={styles.sectionTitle}>Exercise Progress</h2>

      <div className={styles.filters}>
        <Input
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        <Select
          value={muscleFilter}
          onChange={(e) => setMuscleFilter(e.target.value as MuscleGroup | '')}
          options={muscleGroups.map((mg) => ({ value: mg, label: formatMuscleGroup(mg) }))}
          placeholder="All muscles"
        />
        <Select
          value={equipmentFilter}
          onChange={(e) => setEquipmentFilter(e.target.value)}
          options={equipment.map((eq) => ({ value: eq, label: eq }))}
          placeholder="All equipment"
        />
      </div>

      {hasFilters && (
        <button className={styles.clearFilters} onClick={clearFilters}>
          Clear filters
        </button>
      )}

      <div className={styles.list}>
        {filteredExercises.map(({ exercise, sessionCount }) => (
          <ExerciseItem
            key={exercise.id}
            exercise={exercise}
            sessionCount={sessionCount}
            onClick={() => navigate(`/progress/${exercise.id}`)}
          />
        ))}
        {filteredExercises.length === 0 && (
          <p className={styles.empty}>
            {exercisesWithHistory.length === 0
              ? 'Complete some workouts to see progress data.'
              : 'No exercises match your filters.'}
          </p>
        )}
      </div>
    </div>
  );
}
