import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { toPng } from 'html-to-image';
import Model from 'react-body-highlighter';
import type { IExerciseData, Muscle } from 'react-body-highlighter';
import { useOverallStats, useMuscleDistribution } from '../../hooks/useStats';
import { useSetting } from '../../hooks/useSettings';
import type { MuscleGroup } from '../../types/exercise';
import type { TimePeriod } from './AnalyticsDashboard';
import styles from './ExportCard.module.css';

const MUSCLE_MAP: Record<MuscleGroup, Muscle | null> = {
  'calves': 'calves',
  'quads': 'quadriceps',
  'hamstrings': 'hamstring',
  'glutes': 'gluteal',
  'adductors': 'adductor',
  'abductors': 'abductors',
  'lower-abs': 'abs',
  'upper-abs': 'abs',
  'obliques': 'obliques',
  'lower-chest': 'chest',
  'mid-chest': 'chest',
  'upper-chest': 'chest',
  'forearms': 'forearm',
  'triceps': 'triceps',
  'biceps': 'biceps',
  'brachioradialis': 'forearm',
  'front-delts': 'front-deltoids',
  'side-delts': 'front-deltoids',
  'rear-delts': 'back-deltoids',
  'traps': 'trapezius',
  'rhomboids': 'upper-back',
  'lats-upper': 'upper-back',
  'lats-lower': 'lower-back',
  'erector-spinae': 'lower-back',
  'neck': 'neck',
};

const TIER_COLORS = [
  '#4a6670',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
];

const PERIOD_LABELS: Record<TimePeriod, string> = {
  '1W': 'Last 7 Days',
  '1M': 'Last 30 Days',
  '3M': 'Last 3 Months',
  '6M': 'Last 6 Months',
  '1Y': 'Last Year',
  'ALL': 'All Time',
};

export interface ExportCardHandle {
  exportImage: () => Promise<void>;
}

interface ExportCardProps {
  days: number;
  period: TimePeriod;
}

export const ExportCard = forwardRef<ExportCardHandle, ExportCardProps>(
  function ExportCard({ days, period }, ref) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);
    const stats = useOverallStats(days);
    const distribution = useMuscleDistribution(days);
    const theme = useSetting('theme');
    const bodyColor = theme === 'light' ? '#c8c8c8' : '#3a3a3a';

    // Build tiered heatmap data (same logic as MuscleHeatmap)
    const tieredData: IExerciseData[] = [];
    if (distribution && distribution.length > 0) {
      const muscleVolumes = new Map<Muscle, number>();
      for (const d of distribution) {
        const mapped = MUSCLE_MAP[d.muscleGroup as MuscleGroup];
        if (!mapped) continue;
        muscleVolumes.set(mapped, (muscleVolumes.get(mapped) ?? 0) + d.volume);
      }
      const maxVol = Math.max(...muscleVolumes.values(), 1);
      for (const [muscle, vol] of muscleVolumes) {
        const ratio = vol / maxVol;
        let tier: number;
        if (ratio > 0.85) tier = 5;
        else if (ratio > 0.65) tier = 4;
        else if (ratio > 0.40) tier = 3;
        else if (ratio > 0.20) tier = 2;
        else tier = 1;
        tieredData.push({ name: `tier-${tier}`, muscles: [muscle], frequency: tier });
      }
    }

    // Top 3 muscle groups
    const topMuscles = distribution
      ? distribution.slice(0, 3).map((d) => ({
          name: d.muscleGroup
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          pct: d.percentage,
        }))
      : [];

    const formatVolume = (kg: number) => {
      if (kg >= 1000000) return `${(kg / 1000000).toFixed(1)}M`;
      if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`;
      return `${kg}`;
    };

    const exportImage = useCallback(async () => {
      if (!cardRef.current || exporting) return;
      setExporting(true);

      try {
        // Make card visible for capture
        const el = cardRef.current;
        el.style.position = 'fixed';
        el.style.left = '0';
        el.style.top = '0';
        el.style.zIndex = '-9999';
        el.style.opacity = '1';
        el.style.pointerEvents = 'none';

        // Wait for render
        await new Promise((r) => setTimeout(r, 200));

        const dataUrl = await toPng(el, {
          pixelRatio: 2,
          backgroundColor: '#141414',
          width: 440,
          height: el.scrollHeight,
        });

        // Hide card again
        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        el.style.zIndex = '';
        el.style.opacity = '';
        el.style.pointerEvents = '';

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
          } catch {
            // Share cancelled or failed, fall through to download
          }
        }

        // Fallback: download
        const link = document.createElement('a');
        link.download = `gym-tracker-${period.toLowerCase()}.png`;
        link.href = dataUrl;
        link.click();
      } finally {
        setExporting(false);
      }
    }, [exporting, period]);

    useImperativeHandle(ref, () => ({ exportImage }), [exportImage]);

    if (!stats) return null;

    const dateStr = new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <div
        ref={cardRef}
        className={styles.card}
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
      >
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
            <span className={styles.statNum}>{formatVolume(stats.totalVolume)}<small> kg</small></span>
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
            <span className={styles.statLbl}>Day Streak</span>
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
                bodyColor={bodyColor}
                highlightedColors={TIER_COLORS}
                svgStyle={{ width: '100%', height: 'auto' }}
              />
            </div>
            <div className={styles.heatmapView}>
              <Model
                data={tieredData}
                type="posterior"
                bodyColor={bodyColor}
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
              {topMuscles.map((m, i) => (
                <span key={m.name} className={styles.topItem}>
                  {i === 0 ? '' : i === 1 ? '' : ''} {m.name} {m.pct}%
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
);
