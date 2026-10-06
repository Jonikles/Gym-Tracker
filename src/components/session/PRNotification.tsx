import type { PR } from '../../types';
import { formatPRValue } from '../../utils/pr';
import { PROGRESSION_MAP } from '../../data/progressions';
import styles from './PRNotification.module.css';

interface PRNotificationProps {
  prs: PR[];
}

/** One compact line per set, e.g. "🏆 PR · 42kg · 9 reps · LVL UP Planche" */
export function PRNotification({ prs }: PRNotificationProps) {
  const recordPRs = prs.filter((pr) => pr.type === 'weight' || pr.type === 'reps');
  const levelUps = prs.filter((pr) => pr.type === 'progression');
  if (recordPRs.length === 0 && levelUps.length === 0) return null;

  const parts: string[] = [];
  for (const pr of recordPRs) parts.push(formatPRValue(pr.type, pr.value));
  for (const pr of levelUps) {
    const name = pr.progressionId ? PROGRESSION_MAP[pr.progressionId]?.name : undefined;
    const level = `Lvl ${pr.value}`;
    parts.push(name ? `LVL UP · ${name} ${level}` : `LVL UP · ${level}`);
  }

  return (
    <div className={`${styles.line} ${recordPRs.length === 0 ? styles.progression : ''}`}>
      <span className={styles.badge}>{recordPRs.length > 0 ? '🏆 PR' : '⬆'}</span>
      <span className={styles.values}>{parts.join(' · ')}</span>
    </div>
  );
}
