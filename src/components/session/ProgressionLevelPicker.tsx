import { useRef, useEffect } from 'react';
import { Modal, Button } from '../common';
import { useProgressionExercises } from '../../hooks/useProgressions';
import { PROGRESSION_MAP } from '../../data/progressions';
import type { Exercise } from '../../types';
import styles from './ProgressionLevelPicker.module.css';

interface ProgressionLevelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  progressionId: string;
  currentExerciseId: string;
  onSelect: (exercise: Exercise) => void;
}

export function ProgressionLevelPicker({
  isOpen,
  onClose,
  progressionId,
  currentExerciseId,
  onSelect,
}: ProgressionLevelPickerProps) {
  const exercises = useProgressionExercises(progressionId);
  const listRef = useRef<HTMLDivElement>(null);

  const progression = PROGRESSION_MAP[progressionId];

  // Scroll to current exercise when opening
  useEffect(() => {
    if (isOpen && listRef.current) {
      const timer = setTimeout(() => {
        const currentEl = listRef.current?.querySelector(`[data-current="true"]`);
        if (currentEl) {
          currentEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSelect = (exercise: Exercise) => {
    if (exercise.id === currentExerciseId) {
      onClose();
      return;
    }
    onSelect(exercise);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Switch Level — ${progression?.name ?? 'Progression'}`}
    >
      <div className={styles.container}>
        <p className={styles.subtitle}>
          Select which level to work on. Your current sets will be kept.
        </p>

        <div className={styles.list} ref={listRef}>
          {(exercises ?? []).map((exercise) => {
            const level =
              exercise.progressionMemberships?.find(
                (pm) => pm.progressionId === progressionId
              )?.level ?? 0;
            const isCurrent = exercise.id === currentExerciseId;

            return (
              <button
                key={exercise.id}
                className={`${styles.levelItem} ${isCurrent ? styles.current : ''}`}
                onClick={() => handleSelect(exercise)}
                data-current={isCurrent}
              >
                <span className={styles.levelBadge}>Lvl {level}</span>
                <span className={styles.exerciseName}>{exercise.name}</span>
                {isCurrent && <span className={styles.currentLabel}>Current</span>}
              </button>
            );
          })}
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
