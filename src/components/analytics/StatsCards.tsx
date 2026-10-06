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
      <div className={`${styles.statCard} ${styles.statCardWide}`}>
        <span className={styles.statCardLabel}>Day Streak</span>
        <span className={`${styles.statCardValue} ${stats.currentStreak > 0 ? styles.streak : ''}`}>
          {stats.currentStreak}
          <span className={styles.statCardUnit}>{stats.currentStreak === 1 ? ' day' : ' days'}</span>
        </span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statCardValue}>{stats.totalSessions}</span>
        <span className={styles.statCardLabel}>Workouts</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statCardValue}>
          {formatCompactNumber(stats.totalVolume)}
          <span className={styles.statCardUnit}> kg</span>
        </span>
        <span className={styles.statCardLabel}>Total Volume</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statCardValue}>{stats.totalSets}</span>
        <span className={styles.statCardLabel}>Total Sets</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statCardValue}>{stats.totalPRs}</span>
        <span className={styles.statCardLabel}>PRs Achieved</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statCardValue}>
          {stats.avgDurationMin}
          <span className={styles.statCardUnit}>m</span>
        </span>
        <span className={styles.statCardLabel}>Avg Duration</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statCardValue}>
          {stats.consistencyRate}
          <span className={styles.statCardUnit}>%</span>
        </span>
        <span className={styles.statCardLabel}>Consistency</span>
      </div>
    </div>
  );
}
