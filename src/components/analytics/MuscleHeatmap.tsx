import { useState, useCallback } from 'react';
import Model from 'react-body-highlighter';
import type { Muscle, IMuscleStats } from 'react-body-highlighter';
import { useMuscleDistribution, useMuscleExerciseBreakdown } from '../../hooks/useStats';
import {
  REVERSE_MUSCLE_MAP,
  TIER_COLORS,
  TIER_LABELS,
  MUSCLE_COLORS,
  buildMuscleHeatmap,
  volumeTier,
} from './muscleMap';
import styles from './Analytics.module.css';

/** Human-readable labels for library muscle names. */
const MUSCLE_LABELS: Record<string, string> = {
  'chest': 'Chest',
  'abs': 'Abs',
  'obliques': 'Obliques',
  'quadriceps': 'Quads',
  'hamstring': 'Hamstrings',
  'gluteal': 'Glutes',
  'calves': 'Calves',
  'adductor': 'Adductors',
  'abductors': 'Abductors',
  'biceps': 'Biceps',
  'triceps': 'Triceps',
  'forearm': 'Forearms',
  'front-deltoids': 'Front Delts',
  'back-deltoids': 'Rear Delts',
  'trapezius': 'Traps',
  'upper-back': 'Upper Back',
  'lower-back': 'Lower Back',
  'neck': 'Neck',
};

interface MuscleHeatmapProps {
  days: number;
}

export function MuscleHeatmap({ days }: MuscleHeatmapProps) {
  const distribution = useMuscleDistribution(days);
  const [selectedMuscle, setSelectedMuscle] = useState<Muscle | null>(null);

  // Get the app-level muscle groups for the selected library muscle
  const selectedMuscleGroups = selectedMuscle
    ? REVERSE_MUSCLE_MAP[selectedMuscle] ?? null
    : null;

  const breakdown = useMuscleExerciseBreakdown(days, selectedMuscleGroups);

  const handleMuscleClick = useCallback((stats: IMuscleStats) => {
    setSelectedMuscle((prev) =>
      prev === stats.muscle ? null : stats.muscle
    );
  }, []);

  if (!distribution || distribution.length === 0) {
    return (
      <div className={styles.chart}>
        <h3 className={styles.chartTitle}>Muscle Balance</h3>
        <div className={styles.empty}>No workout data yet</div>
      </div>
    );
  }

  const { muscleVolumes, maxVol, tieredData } = buildMuscleHeatmap(distribution);

  // Get tier color for the selected muscle (for the drill-down header accent)
  const selectedTierColor = selectedMuscle
    ? TIER_COLORS[volumeTier((muscleVolumes.get(selectedMuscle) ?? 0) / maxVol) - 1]
    : undefined;

  const selectedLabel = selectedMuscle
    ? MUSCLE_LABELS[selectedMuscle] ?? selectedMuscle
    : '';

  const formatVolume = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`;
    return `${kg}`;
  };

  const bodyColor = MUSCLE_COLORS.body;

  return (
    <div className={styles.chart}>
      <h3 className={styles.chartTitle}>Muscle Balance</h3>
      <p className={styles.chartHint}>Tap a muscle to see exercise breakdown</p>
      <div className={styles.heatmapBody}>
        <div className={styles.heatmapView}>
          <Model
            data={tieredData}
            type="anterior"
            bodyColor={bodyColor}
            highlightedColors={TIER_COLORS}
            onClick={handleMuscleClick}
            svgStyle={{ width: '100%', height: 'auto' }}
          />
          <span className={styles.heatmapViewLabel}>Front</span>
        </div>
        <div className={styles.heatmapView}>
          <Model
            data={tieredData}
            type="posterior"
            bodyColor={bodyColor}
            highlightedColors={TIER_COLORS}
            onClick={handleMuscleClick}
            svgStyle={{ width: '100%', height: 'auto' }}
          />
          <span className={styles.heatmapViewLabel}>Back</span>
        </div>
      </div>

      {/* Drill-down panel */}
      {selectedMuscle && (
        <div className={styles.drillDown}>
          <div className={styles.drillDownHeader}>
            <span
              className={styles.drillDownDot}
              style={{ backgroundColor: selectedTierColor }}
            />
            <span className={styles.drillDownTitle}>{selectedLabel}</span>
            <span className={styles.drillDownVolume}>
              {formatVolume(muscleVolumes.get(selectedMuscle) ?? 0)} kg total
            </span>
            <button
              className={styles.drillDownClose}
              onClick={() => setSelectedMuscle(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {breakdown && breakdown.length > 0 ? (
            <div className={styles.drillDownList}>
              {breakdown.map((item) => (
                <div key={item.exerciseId} className={styles.drillDownItem}>
                  <div className={styles.drillDownExercise}>
                    <span className={styles.drillDownName}>{item.exerciseName}</span>
                    <span className={styles.drillDownSets}>{item.sets} sets</span>
                  </div>
                  <div className={styles.drillDownBar}>
                    <div
                      className={styles.drillDownBarFill}
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: selectedTierColor,
                      }}
                    />
                  </div>
                  <div className={styles.drillDownMeta}>
                    <span>{formatVolume(item.volume)} kg</span>
                    <span>{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : breakdown === null ? null : (
            <div className={styles.drillDownEmpty}>
              No exercises found for this muscle group
            </div>
          )}
        </div>
      )}

      <div className={styles.heatmapLegend}>
        {TIER_LABELS.map((t) => (
          <div key={t.label} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ backgroundColor: t.color }} />
            <span className={styles.legendLabel}>{t.label}</span>
          </div>
        ))}
        <div className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ backgroundColor: bodyColor }} />
          <span className={styles.legendLabel}>Not trained</span>
        </div>
      </div>
    </div>
  );
}
