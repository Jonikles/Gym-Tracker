import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
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
  const rawData = useWeeklyVolume(days);

  // The last bucket is the current, still-in-progress week — flag it so it
  // renders as "partial" instead of looking like a sudden drop.
  const data = useMemo(
    () => rawData?.map((d, i) => ({ ...d, isCurrent: i === rawData.length - 1 })),
    [rawData]
  );

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
            <defs>
              <pattern
                id="volume-current-week"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill="var(--color-accent)" fillOpacity={0.25} />
                <rect width="3" height="6" fill="var(--color-accent)" fillOpacity={0.55} />
              </pattern>
            </defs>
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
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload?.isCurrent ? `${label} (this week, so far)` : label
              }
              formatter={(value) => [`${Number(value).toLocaleString()} kg`, 'Volume']}
            />
            <Bar dataKey="totalVolume" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.weekStart}
                  fill={d.isCurrent ? 'url(#volume-current-week)' : 'var(--color-accent)'}
                  stroke={d.isCurrent ? 'var(--color-accent)' : undefined}
                  strokeOpacity={d.isCurrent ? 0.6 : undefined}
                  strokeDasharray={d.isCurrent ? '3 2' : undefined}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
