import { useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint } from '../../hooks/useAnalytics';
import { CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_TOOLTIP_PROPS } from './chartTheme';
import { formatShortDate } from '../common/format';
import styles from './Charts.module.css';

interface ProgressChartProps {
  data: ChartDataPoint[];
  title: string;
  unit: string;
  /** Line/area color (any CSS color, tokens welcome). Defaults to the accent. */
  color?: string;
}

function formatValue(v: number): string {
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}

export function ProgressChart({ data, title, unit, color = 'var(--color-accent)' }: ProgressChartProps) {
  const gradientId = `progress-fill-${useId().replace(/:/g, '')}`;

  if (data.length === 0) {
    return (
      <div className={`surface ${styles.chart}`}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.empty}>No data available</div>
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    dateLabel: formatShortDate(d.date),
  }));

  const minValue = Math.min(...data.map((d) => d.value));
  const maxValue = Math.max(...data.map((d) => d.value));
  const padding = (maxValue - minValue) * 0.1 || 10;
  const current = data[data.length - 1].value;

  return (
    <div className={`surface ${styles.chart}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.headline}>
          <span className="num">{formatValue(current)}</span>
          <span className={styles.unit}>{unit}</span>
        </span>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={formattedData} margin={{ top: 8, right: 6, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.35 }} />
                <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis
              dataKey="dateLabel"
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              minTickGap={16}
              tickMargin={6}
            />
            <YAxis
              domain={[minValue - padding, maxValue + padding]}
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v) => `${Math.round(v)}`}
            />
            <Tooltip
              {...CHART_TOOLTIP_PROPS}
              formatter={(value) => [`${Number(value).toFixed(1)} ${unit}`, title]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={{ fill: color, stroke: 'var(--color-surface-1)', strokeWidth: 2, r: 3.5 }}
              activeDot={{ fill: color, stroke: 'var(--color-surface-1)', strokeWidth: 2, r: 5.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Current</span>
          <span className={styles.statValue}>
            <span className="num">{current.toFixed(1)}</span> <span className={styles.unit}>{unit}</span>
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Best</span>
          <span className={styles.statValue}>
            <span className="num">{maxValue.toFixed(1)}</span> <span className={styles.unit}>{unit}</span>
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Sessions</span>
          <span className={`num ${styles.statValue}`}>{data.length}</span>
        </div>
      </div>
    </div>
  );
}
