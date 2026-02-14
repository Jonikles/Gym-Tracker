import { useState, useEffect } from 'react';
import { getPreviousSets } from '../../hooks/useSets';
import type { Set } from '../../types';
import styles from './SetHistory.module.css';

interface SetHistoryProps {
  exerciseId: string;
}

export function SetHistory({ exerciseId }: SetHistoryProps) {
  const [previousSets, setPreviousSets] = useState<Set[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const sets = await getPreviousSets(exerciseId);
      setPreviousSets(sets);
      setIsLoading(false);
    }
    load();
  }, [exerciseId]);

  if (isLoading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (previousSets.length === 0) {
    return (
      <div className={styles.container}>
        <span className={styles.empty}>No previous data</span>
      </div>
    );
  }

  const workingSets = previousSets.filter((s) => !s.isWarmup);

  return (
    <div className={styles.container}>
      <span className={styles.label}>Previous:</span>
      <div className={styles.sets}>
        {workingSets.map((set, index) => (
          <span key={set.id} className={styles.set}>
            {set.weight ?? '?'}×{set.reps ?? '?'}
            {index < workingSets.length - 1 && ', '}
          </span>
        ))}
      </div>
    </div>
  );
}
