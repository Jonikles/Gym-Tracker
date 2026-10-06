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
import { CHART_AXIS_TICK, CHART_BAR_CURSOR, CHART_GRID_STROKE, CHART_TOOLTIP_PROPS } from '../progress/chartTheme';
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
        <h3 className={styles.chartTitle}>Weekly volume</h3>
        <div className={styles.empty}>No workout data yet</div>
      </div>
    );
  }

  return (
    <div className={styles.chart}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Weekly volume</h3>
        <span className={styles.chartUnit}>kg</span>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 8, right: 6, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="volume-bar-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--color-accent)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0.45 }} />
              </linearGradient>
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
            <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis
              dataKey="weekLabel"
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              {...CHART_TOOLTIP_PROPS}
              cursor={CHART_BAR_CURSOR}
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload?.isCurrent ? `${label} (this week, so far)` : label
              }
              formatter={(value) => [`${Number(value).toLocaleString()} kg`, 'Volume']}
            />
            <Bar dataKey="totalVolume" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.weekStart}
                  fill={d.isCurrent ? 'url(#volume-current-week)' : 'url(#volume-bar-fill)'}
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
