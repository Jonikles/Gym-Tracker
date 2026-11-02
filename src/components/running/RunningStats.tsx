import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSetting } from '../../hooks/useSettings';
import { useToday } from '../../hooks/useToday';
import { formatDistance, formatPace, formatRunTime } from '../../utils/run';
import { computeBestTimes, paceTrend, startOfWeek, totalsSince, weeklyDistance } from '../../utils/runStats';
import type { Run } from '../../types';
import { CHART_AXIS_TICK, CHART_BAR_CURSOR, CHART_GRID_STROKE, CHART_TOOLTIP_PROPS } from '../progress/chartTheme';
import styles from './Running.module.css';

const WEEKS_SHOWN = 12;
const PACE_TREND_DAYS = 120;

/** "5:12" for a pace axis */
const paceTick = (v: number) => formatPace(v).replace(' /km', '');

function Tile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className={styles.tile}>
      <span className="stat-label">{label}</span>
      <span className={styles.tileValue}>
        <span className="num">{value}</span>
        {unit && <span className={styles.statUnit}> {unit}</span>}
      </span>
      {sub && <span className={`num ${styles.tileSub}`}>{sub}</span>}
    </div>
  );
}

function WeeklyDistanceChart({ runs, weekStartDay }: { runs: Run[]; weekStartDay: number }) {
  const data = useMemo(() => weeklyDistance(runs, WEEKS_SHOWN, weekStartDay), [runs, weekStartDay]);
  return (
    <div className={`surface ${styles.chartCard}`}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Weekly distance</h3>
        <span className={styles.chartUnit}>km</span>
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
          <XAxis dataKey="label" tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Tooltip
            {...CHART_TOOLTIP_PROPS}
            cursor={CHART_BAR_CURSOR}
            labelFormatter={(label, payload) =>
              payload?.[0]?.payload?.isCurrent ? `Week of ${label} (so far)` : `Week of ${label}`
            }
            formatter={(value, _name, item) => [
              `${value} km · ${item.payload.runs} run${item.payload.runs === 1 ? '' : 's'}`,
              'Distance',
            ]}
          />
          <Bar dataKey="km" radius={[5, 5, 0, 0]} maxBarSize={26} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.weekStart}
                fill="var(--color-success)"
                fillOpacity={d.isCurrent ? 0.45 : 0.9}
                stroke={d.isCurrent ? 'var(--color-success)' : undefined}
                strokeDasharray={d.isCurrent ? '3 2' : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PaceTrendChart({ runs, today }: { runs: Run[]; today: number }) {
  const data = useMemo(() => paceTrend(runs, today - PACE_TREND_DAYS * 86_400_000), [runs, today]);
  if (data.length < 2) return null;
  return (
    <div className={`surface ${styles.chartCard}`}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Average pace</h3>
        <span className={styles.chartUnit}>min/km · faster is higher</span>
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
          <XAxis dataKey="label" tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis
            reversed
            domain={['dataMin - 15', 'dataMax + 15']}
            tick={CHART_AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={paceTick}
          />
          <Tooltip
            {...CHART_TOOLTIP_PROPS}
            labelFormatter={(label, payload) => `${payload?.[0]?.payload?.name ?? 'Run'} · ${label}`}
            formatter={(value) => [formatPace(Number(value)), 'Pace']}
          />
          <Line
            type="monotone"
            dataKey="pace"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: 'var(--color-accent)', strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function BestTimes({ runs }: { runs: Run[] }) {
  const navigate = useNavigate();
  const best = useMemo(() => computeBestTimes(runs), [runs]);
  if (best.length === 0) return null;
  return (
    <section className={styles.section} aria-label="Best times">
      <h2 className="section-title">Best times</h2>
      <div className={`surface ${styles.effortList}`}>
        {best.map((b) => (
          <button key={b.key} type="button" className={`${styles.effortRow} ${styles.effortButton}`} onClick={() => navigate(`/running/${b.runId}`)}>
            <span className={styles.effortName}>{b.label}</span>
            <span className={`num ${styles.bestTime}`}>{formatRunTime(b.seconds)}</span>
            <span className={`num ${styles.effortPace}`}>
              {new Date(b.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Totals, charts and best times at the top of the Running page */
export function RunningStats({ runs }: { runs: Run[] }) {
  const today = useToday();
  const weekStartDay = useSetting('weekStartDay');

  const { week, month } = useMemo(() => {
    const t = new Date(today);
    return {
      week: totalsSince(runs, startOfWeek(today, weekStartDay)),
      month: totalsSince(runs, new Date(t.getFullYear(), t.getMonth(), 1).getTime()),
    };
  }, [runs, today, weekStartDay]);

  if (runs.length === 0) return null;

  return (
    <>
      <div className={`surface ${styles.tiles}`}>
        <Tile
          label="This week"
          value={formatDistance(week.distance).replace(' km', '')}
          unit="km"
          sub={`${week.runs} run${week.runs === 1 ? '' : 's'} · ${formatRunTime(week.movingTime)}`}
        />
        <Tile
          label={new Date(today).toLocaleDateString(undefined, { month: 'long' })}
          value={formatDistance(month.distance).replace(' km', '')}
          unit="km"
          sub={`${month.runs} run${month.runs === 1 ? '' : 's'} · ${formatRunTime(month.movingTime)}`}
        />
      </div>
      <WeeklyDistanceChart runs={runs} weekStartDay={weekStartDay} />
      <PaceTrendChart runs={runs} today={today} />
      <BestTimes runs={runs} />
    </>
  );
}
