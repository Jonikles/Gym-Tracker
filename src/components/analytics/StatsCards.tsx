import { useOverallStats } from '../../hooks/useStats';
import { formatCompactNumber } from '../common/format';
import styles from './Analytics.module.css';

interface StatsCardsProps {
  days: number;
}

export function StatsCards({ days }: StatsCardsProps) {
  const stats = useOverallStats(days);

  if (!stats) {
    return null;
  }

  return (
    <div className={styles.statsGrid}>
      {/* Full-width streak tile keeps the remaining 6 tiles in an even grid */}
      <div className={`${styles.statCard} ${styles.statCardWide} ${stats.currentStreak > 0 ? styles.streakOn : ''}`}>
        <span className={styles.streakLabel}>Workout streak</span>
        <span className={styles.streakValue}>
          <span className="stat-value">{stats.currentStreak}</span>
          <span className={styles.statCardUnit}>{stats.currentStreak === 1 ? 'workout' : 'workouts'}</span>
        </span>
      </div>
      <div className={styles.statCard}>
        <span className="stat-value">{stats.totalSessions}</span>
        <span className="stat-label">Workouts</span>
      </div>
      <div className={styles.statCard}>
        <span className="stat-value">
          {formatCompactNumber(stats.totalVolume)}
          <span className={styles.statCardUnit}>kg</span>
        </span>
        <span className="stat-label">Total volume</span>
      </div>
      <div className={styles.statCard}>
        <span className="stat-value">{stats.totalSets}</span>
        <span className="stat-label">Total sets</span>
      </div>
      <div className={styles.statCard}>
        <span className={`stat-value ${stats.totalPRs > 0 ? styles.prValue : ''}`}>{stats.totalPRs}</span>
        <span className="stat-label">PRs achieved</span>
      </div>
      <div className={styles.statCard}>
        <span className="stat-value">
          {stats.avgDurationMin}
          <span className={styles.statCardUnit}>min</span>
        </span>
        <span className="stat-label">Avg duration</span>
      </div>
      <div className={styles.statCard}>
        <span className="stat-value">
          {stats.consistencyRate}
          <span className={styles.statCardUnit}>%</span>
        </span>
        <span className="stat-label">Consistency</span>
      </div>
    </div>
  );
}
