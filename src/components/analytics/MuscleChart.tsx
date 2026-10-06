import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useMuscleDistribution } from '../../hooks/useStats';
import { CHART_TOOLTIP_PROPS } from '../progress/chartTheme';
import { formatMuscleGroup } from '../common/format';
import styles from './Analytics.module.css';

/** Categorical palette built from the design tokens (accent first) */
const COLORS = [
  'var(--color-accent)',
  '#818cf8', // indigo (end of --gradient-accent)
  'var(--color-success)',
  'var(--color-pr)',
  'var(--color-danger-text)',
  '#c084fc',
  '#2dd4bf',
  'var(--color-warning)',
  'var(--color-text-muted)',
];

interface MuscleChartProps {
  days: number;
}

export function MuscleChart({ days }: MuscleChartProps) {
  const data = useMuscleDistribution(days);

  if (!data || data.length === 0) {
    return (
      <div className={styles.chart}>
        <h3 className={styles.chartTitle}>Muscle distribution</h3>
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
    name: formatMuscleGroup(d.muscleGroup),
  }));

  return (
    <div className={styles.chart}>
      <h3 className={styles.chartTitle}>Muscle distribution</h3>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="volume"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={1.5}
              stroke="var(--color-surface-1)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              {...CHART_TOOLTIP_PROPS}
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
            <span className={styles.muscleName}>{formatMuscleGroup(d.muscleGroup)}</span>
            <span className={`num ${styles.muscleValue}`}>{d.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
