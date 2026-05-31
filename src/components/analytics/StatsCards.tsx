import { useOverallStats } from '../../hooks/useStats';
import styles from './Analytics.module.css';

interface StatsCardsProps {
  days: number;
}

export function StatsCards({ days }: StatsCardsProps) {
  const stats = useOverallStats(days);

  if (!stats) {
    return null;
  }

  const formatVolume = (kg: number) => {
    if (kg >= 1000000) return `${(kg / 1000000).toFixed(1)}M kg`;
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
    return `${kg} kg`;
  };

  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <span className={styles.statCardValue}>{stats.totalSessions}</span>
        <span className={styles.statCardLabel}>Workouts</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statCardValue}>{formatVolume(stats.totalVolume)}</span>
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
        <span className={`${styles.statCardValue} ${stats.currentStreak > 0 ? styles.streak : ''}`}>
          {stats.currentStreak}
        </span>
        <span className={styles.statCardLabel}>Day Streak</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statCardValue}>{stats.avgDurationMin}m</span>
        <span className={styles.statCardLabel}>Avg Duration</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statCardValue}>{stats.consistencyRate}%</span>
        <span className={styles.statCardLabel}>Consistency</span>
      </div>
    </div>
  );
}
