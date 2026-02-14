import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useMuscleDistribution } from '../../hooks/useStats';
import styles from './Analytics.module.css';

const COLORS = [
  'var(--color-accent)',
  'var(--color-success)',
  'var(--pr-weight)',
  'var(--pr-e1rm)',
  'var(--color-error)',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
];

export function MuscleChart() {
  const data = useMuscleDistribution(30);

  if (!data || data.length === 0) {
    return (
      <div className={styles.chart}>
        <h3 className={styles.chartTitle}>Muscle Distribution (30 days)</h3>
        <div className={styles.empty}>No workout data yet</div>
      </div>
    );
  }

  // Take top 8, group rest as "Other"
  const displayData: Array<{ muscleGroup: string; volume: number; sets: number; percentage: number }> = [...data.slice(0, 8)];
  const otherData = data.slice(8);
  if (otherData.length > 0) {
    const otherVolume = otherData.reduce((sum, d) => sum + d.volume, 0);
    const otherSets = otherData.reduce((sum, d) => sum + d.sets, 0);
    const otherPercentage = otherData.reduce((sum, d) => sum + d.percentage, 0);
    displayData.push({
      muscleGroup: 'Other',
      volume: otherVolume,
      sets: otherSets,
      percentage: otherPercentage,
    });
  }

  // Convert to recharts format with index signature
  const chartData = displayData.map((d) => ({
    ...d,
    name: d.muscleGroup,
  }));

  return (
    <div className={styles.chart}>
      <h3 className={styles.chartTitle}>Muscle Distribution (30 days)</h3>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="volume"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(props) => {
                const entry = chartData[props.index];
                return entry && entry.percentage >= 5 ? `${entry.name} ${entry.percentage}%` : '';
              }}
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
              formatter={(value, name) => [
                `${Number(value).toLocaleString()} kg (${chartData.find((d) => d.name === name)?.sets ?? 0} sets)`,
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.muscleList}>
        {displayData.map((d, i) => (
          <div key={d.muscleGroup} className={styles.muscleItem}>
            <span
              className={styles.muscleColor}
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className={styles.muscleName}>{d.muscleGroup}</span>
            <span className={styles.muscleValue}>{d.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
