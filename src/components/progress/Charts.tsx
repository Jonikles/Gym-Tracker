import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint } from '../../hooks/useAnalytics';
import styles from './Charts.module.css';

interface ProgressChartProps {
  data: ChartDataPoint[];
  title: string;
  unit: string;
  color: string;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function ProgressChart({ data, title, unit, color }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className={styles.chart}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.empty}>No data available</div>
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    dateLabel: formatDate(d.date),
    displayValue: d.value.toFixed(1),
  }));

  const minValue = Math.min(...data.map((d) => d.value));
  const maxValue = Math.max(...data.map((d) => d.value));
  const padding = (maxValue - minValue) * 0.1 || 10;

  return (
    <div className={styles.chart}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              tickLine={{ stroke: 'var(--color-border)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              domain={[minValue - padding, maxValue + padding]}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              tickLine={{ stroke: 'var(--color-border)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(v) => `${Math.round(v)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
              labelStyle={{ color: 'var(--color-text)' }}
              formatter={(value) => [`${Number(value).toFixed(1)} ${unit}`, title]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 0, r: 4 }}
              activeDot={{ fill: color, strokeWidth: 0, r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Current</span>
          <span className={styles.statValue}>
            {data[data.length - 1].value.toFixed(1)} {unit}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Best</span>
          <span className={styles.statValue}>
            {maxValue.toFixed(1)} {unit}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Sessions</span>
          <span className={styles.statValue}>{data.length}</span>
        </div>
      </div>
    </div>
  );
}
