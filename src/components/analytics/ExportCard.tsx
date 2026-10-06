import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Model from 'react-body-highlighter';
import { useOverallStats, useMuscleDistribution } from '../../hooks/useStats';
import { formatMuscleGroup, formatCompactNumber } from '../common/format';
import { TIER_COLORS, MUSCLE_COLORS, buildMuscleHeatmap } from './muscleMap';
import type { TimePeriod } from './AnalyticsDashboard';
import styles from './ExportCard.module.css';

const PERIOD_LABELS: Record<TimePeriod, string> = {
  '1W': 'Last 7 Days',
  '1M': 'Last 30 Days',
  '3M': 'Last 3 Months',
  '6M': 'Last 6 Months',
  '1Y': 'Last Year',
  'ALL': 'All Time',
};

/** How long to wait for the card's data to load before giving up */
const READY_TIMEOUT_MS = 5000;
/** Extra settle time for body diagrams to lay out before capture */
const SETTLE_MS = 200;

export interface ExportCardHandle {
  exportImage: () => Promise<void>;
}

interface ExportCardProps {
  days: number;
  period: TimePeriod;
}

/**
 * Share-image exporter. Renders nothing (and runs no data queries) until
 * `exportImage()` is called; then mounts a hidden card, waits for its data,
 * captures it as a PNG and unmounts it again.
 */
export const ExportCard = forwardRef<ExportCardHandle, ExportCardProps>(
  function ExportCard({ days, period }, ref) {
    const [requested, setRequested] = useState(false);
    const busyRef = useRef(false);
    const readyResolverRef = useRef<((el: HTMLDivElement) => void) | null>(null);

    const handleReady = useCallback((el: HTMLDivElement) => {
      readyResolverRef.current?.(el);
      readyResolverRef.current = null;
    }, []);

    const exportImage = useCallback(async () => {
      if (busyRef.current) return;
      busyRef.current = true;

      try {
        // Start loading the capture library while the card renders
        const htmlToImagePromise = import('html-to-image');

        const el = await new Promise<HTMLDivElement>((resolve, reject) => {
          const timer = window.setTimeout(() => {
            readyResolverRef.current = null;
            reject(new Error('Export card did not render in time'));
          }, READY_TIMEOUT_MS);
          readyResolverRef.current = (node) => {
            window.clearTimeout(timer);
            resolve(node);
          };
          setRequested(true);
        });

        const { toPng } = await htmlToImagePromise;
        await new Promise((r) => setTimeout(r, SETTLE_MS));

        const dataUrl = await toPng(el, {
          pixelRatio: 2,
          backgroundColor: '#12171c',
          width: 440,
          height: el.scrollHeight,
        });

        // Try Web Share API first (mobile)
        if (navigator.share && navigator.canShare) {
          try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'gym-tracker-stats.png', { type: 'image/png' });

            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: 'My Training Stats',
                files: [file],
              });
              return;
            }
          } catch (err) {
            // User cancelled the share sheet — don't fall through to a download
            if (err instanceof DOMException && err.name === 'AbortError') return;
            // Otherwise fall through to download
          }
        }

        // Fallback: download
        const link = document.createElement('a');
        link.download = `gym-tracker-${period.toLowerCase()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        readyResolverRef.current = null;
        busyRef.current = false;
        setRequested(false);
      }
    }, [period]);

    useImperativeHandle(ref, () => ({ exportImage }), [exportImage]);

    if (!requested) return null;

    return (
      // The wrapper hides the card; the card itself carries no hiding styles,
      // so the captured clone renders normally and nothing needs restoring.
      <div className={styles.offscreen} aria-hidden="true">
        <ExportCardContent days={days} period={period} onReady={handleReady} />
      </div>
    );
  }
);

interface ExportCardContentProps {
  days: number;
  period: TimePeriod;
  onReady: (el: HTMLDivElement) => void;
}

function ExportCardContent({ days, period, onReady }: ExportCardContentProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const stats = useOverallStats(days);
  const distribution = useMuscleDistribution(days);
  const loaded = stats !== undefined && distribution !== undefined;

  useEffect(() => {
    if (loaded && cardRef.current) onReady(cardRef.current);
  }, [loaded, onReady]);

  if (!stats) return null;

  const { tieredData } = buildMuscleHeatmap(distribution ?? []);

  // Top 3 muscle groups
  const topMuscles = distribution
    ? distribution.slice(0, 3).map((d) => ({
        name: formatMuscleGroup(d.muscleGroup),
        pct: d.percentage,
      }))
    : [];

  const dateStr = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div ref={cardRef} className={styles.card}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <span className={styles.appName}>GymTracker</span>
        <span className={styles.periodLabel}>{PERIOD_LABELS[period]}</span>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.totalSessions}</span>
          <span className={styles.statLbl}>Workouts</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{formatCompactNumber(stats.totalVolume)}<small> kg</small></span>
          <span className={styles.statLbl}>Volume</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.totalSets}</span>
          <span className={styles.statLbl}>Sets</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.totalPRs}</span>
          <span className={styles.statLbl}>PRs</span>
        </div>
      </div>

      {/* Extra stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.avgDurationMin}<small>m</small></span>
          <span className={styles.statLbl}>Avg Session</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.currentStreak}</span>
          <span className={styles.statLbl}>Workout streak</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.consistencyRate}<small>%</small></span>
          <span className={styles.statLbl}>Consistency</span>
        </div>
      </div>

      {/* Body heatmap */}
      {tieredData.length > 0 && (
        <div className={styles.heatmap}>
          <div className={styles.heatmapView}>
            <Model
              data={tieredData}
              type="anterior"
              bodyColor={MUSCLE_COLORS.body}
              highlightedColors={TIER_COLORS}
              svgStyle={{ width: '100%', height: 'auto' }}
            />
          </div>
          <div className={styles.heatmapView}>
            <Model
              data={tieredData}
              type="posterior"
              bodyColor={MUSCLE_COLORS.body}
              highlightedColors={TIER_COLORS}
              svgStyle={{ width: '100%', height: 'auto' }}
            />
          </div>
        </div>
      )}

      {/* Top muscles */}
      {topMuscles.length > 0 && (
        <div className={styles.topMuscles}>
          <span className={styles.topLabel}>Most Trained</span>
          <div className={styles.topList}>
            {topMuscles.map((m) => (
              <span key={m.name} className={styles.topItem}>
                {m.name} {m.pct}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={styles.cardFooter}>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}
