import { StatsCards } from './StatsCards';
import { VolumeChart } from './VolumeChart';
import { FrequencyChart } from './FrequencyChart';
import { MuscleChart } from './MuscleChart';
import styles from './Analytics.module.css';

export function AnalyticsDashboard() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Analytics</h1>
      </header>

      <StatsCards />

      <div className={styles.chartsGrid}>
        <VolumeChart />
        <FrequencyChart />
        <MuscleChart />
      </div>
    </div>
  );
}
