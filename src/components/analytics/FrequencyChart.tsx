import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useWorkoutFrequency } from '../../hooks/useStats';
import styles from './Analytics.module.css';

export function FrequencyChart() {
  const data = useWorkoutFrequency(12);

  if (!data || data.weeks.length === 0) {
    return (
      <div className={styles.chart}>
        <h3 className={styles.chartTitle}>Workout Frequency</h3>
        <div className={styles.empty}>No workout data yet</div>
      </div>
    );
  }

  return (
    <div className={styles.chart}>
      <h3 className={styles.chartTitle}>Workouts per Week</h3>
      <div className={styles.chartStats}>
        <div className={styles.chartStat}>
          <span className={styles.statValue}>{data.currentWeekCount}</span>
          <span className={styles.statLabel}>This week</span>
        </div>
        <div className={styles.chartStat}>
          <span className={styles.statValue}>{data.avgPerWeek}</span>
          <span className={styles.statLabel}>Avg/week</span>
        </div>
        <div className={styles.chartStat}>
          <span className={styles.statValue}>{data.totalSessions}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.weeks} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={{ stroke: 'var(--color-border)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={{ stroke: 'var(--color-border)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
              labelStyle={{ color: 'var(--color-text)' }}
              formatter={(value) => [`${value} workouts`, 'Count']}
            />
            <ReferenceLine
              y={data.avgPerWeek}
              stroke="var(--color-text-muted)"
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-success)"
              strokeWidth={2}
              dot={{ fill: 'var(--color-success)', strokeWidth: 0, r: 4 }}
              activeDot={{ fill: 'var(--color-success)', strokeWidth: 0, r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
