import { useState } from 'react';
import { getExerciseImageUrl } from '../../data/exercise-images';
import styles from './ExerciseImage.module.css';

interface ExerciseImageProps {
  exerciseName: string;
}

export function ExerciseImage({ exerciseName }: ExerciseImageProps) {
  const [frame, setFrame] = useState<0 | 1>(0);
  const [error, setError] = useState(false);

  const url = getExerciseImageUrl(exerciseName, frame);
  if (!url || error) return null;

  return (
    <div className={styles.container}>
      <img
        src={url}
        alt={exerciseName}
        className={styles.image}
        loading="lazy"
        onError={() => setError(true)}
      />
      <div className={styles.toggle}>
        <button
          className={`${styles.frameBtn} ${frame === 0 ? styles.active : ''}`}
          onClick={() => setFrame(0)}
        >
          1
        </button>
        <button
          className={`${styles.frameBtn} ${frame === 1 ? styles.active : ''}`}
          onClick={() => setFrame(1)}
        >
          2
        </button>
      </div>
    </div>
  );
}
