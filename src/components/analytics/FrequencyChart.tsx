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
import { CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_TOOLTIP_PROPS } from '../progress/chartTheme';
import styles from './Analytics.module.css';

interface FrequencyChartProps {
  days: number;
}

export function FrequencyChart({ days }: FrequencyChartProps) {
  const data = useWorkoutFrequency(days);

  if (!data || data.weeks.length === 0) {
    return (
      <div className={styles.chart}>
        <h3 className={styles.chartTitle}>Workouts per week</h3>
        <div className={styles.empty}>No workout data yet</div>
      </div>
    );
  }

  return (
    <div className={styles.chart}>
      <h3 className={styles.chartTitle}>Workouts per week</h3>
      <div className={styles.chartStats}>
        <div className={styles.chartStat}>
          <span className={`num ${styles.statValue} ${styles.statValueAccent}`}>{data.currentWeekCount}</span>
          <span className={styles.statLabel}>This week</span>
        </div>
        <div className={styles.chartStat}>
          <span className={`num ${styles.statValue}`}>{data.avgPerWeek}</span>
          <span className={styles.statLabel}>Avg/week</span>
        </div>
        <div className={styles.chartStat}>
          <span className={`num ${styles.statValue}`}>{data.totalSessions}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.weeks} margin={{ top: 8, right: 6, left: -12, bottom: 0 }}>
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
              domain={[0, 'auto']}
              allowDecimals={false}
              width={44}
            />
            <Tooltip
              {...CHART_TOOLTIP_PROPS}
              formatter={(value) => [`${value} workouts`, 'Count']}
            />
            <ReferenceLine
              y={data.avgPerWeek}
              stroke="var(--color-text-muted)"
              strokeOpacity={0.6}
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              dot={{ fill: 'var(--color-accent)', stroke: 'var(--color-surface-1)', strokeWidth: 2, r: 3.5 }}
              activeDot={{ fill: 'var(--color-accent)', stroke: 'var(--color-surface-1)', strokeWidth: 2, r: 5.5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
