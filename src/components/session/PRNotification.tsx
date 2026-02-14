import type { PR } from '../../types';
import { formatPRType, formatPRValue } from '../../utils/pr';
import styles from './PRNotification.module.css';

interface PRNotificationProps {
  prs: PR[];
}

export function PRNotification({ prs }: PRNotificationProps) {
  if (prs.length === 0) return null;

  return (
    <div className={styles.container}>
      {prs.map((pr) => (
        <div key={pr.id} className={`${styles.pr} ${styles[pr.type]}`}>
          <span className={styles.badge}>PR</span>
          <span className={styles.type}>{formatPRType(pr.type)}</span>
          <span className={styles.value}>{formatPRValue(pr.type, pr.value)}</span>
          {pr.previousValue !== undefined && (
            <span className={styles.improvement}>
              (+{formatPRValue(pr.type, pr.value - pr.previousValue)})
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
