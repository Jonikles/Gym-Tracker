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
        {workingSets.map((set, index) => {
          // Build display parts based on what data exists
          const parts: string[] = [];
          if (set.weight !== undefined) parts.push(`${set.weight}kg`);
          if (set.reps !== undefined) parts.push(`${set.reps}`);
          if (set.time !== undefined) parts.push(`${set.time}s`);
          if (set.distance !== undefined) parts.push(`${set.distance}m`);
          const display = parts.length > 0 ? parts.join('×') : '?';

          return (
            <span key={set.id} className={styles.set}>
              {display}
              {set.intensityTechnique && set.intensityTechnique !== 'standard' && (
                <span className={styles.technique}> ({set.intensityTechnique})</span>
              )}
              {index < workingSets.length - 1 && ', '}
            </span>
          );
        })}
      </div>
    </div>
  );
}
