import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useWeeklyVolume } from '../../hooks/useStats';
import styles from './Analytics.module.css';

interface VolumeChartProps {
  days: number;
}

export function VolumeChart({ days }: VolumeChartProps) {
  const data = useWeeklyVolume(days);

  if (!data || data.length === 0) {
    return (
      <div className={styles.chart}>
        <h3 className={styles.chartTitle}>Weekly Volume</h3>
        <div className={styles.empty}>No workout data yet</div>
      </div>
    );
  }

  return (
    <div className={styles.chart}>
      <h3 className={styles.chartTitle}>Weekly Volume (kg)</h3>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
              labelStyle={{ color: 'var(--color-text)' }}
              formatter={(value) => [`${Number(value).toLocaleString()} kg`, 'Volume']}
            />
            <Bar
              dataKey="totalVolume"
              fill="var(--color-accent)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
