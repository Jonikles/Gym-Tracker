import { useState, useCallback } from 'react';
import Model from 'react-body-highlighter';
import type { IExerciseData, Muscle, IMuscleStats } from 'react-body-highlighter';
import { useMuscleDistribution, useMuscleExerciseBreakdown } from '../../hooks/useStats';
import { useSetting } from '../../hooks/useSettings';
import type { MuscleGroup } from '../../types/exercise';
import styles from './Analytics.module.css';

/**
 * Map app MuscleGroup keys → react-body-highlighter Muscle names.
 */
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

/** Reverse map: library Muscle → all app MuscleGroup keys that map to it. */
const REVERSE_MUSCLE_MAP: Record<string, MuscleGroup[]> = {};
for (const [mg, muscle] of Object.entries(MUSCLE_MAP) as [MuscleGroup, Muscle | null][]) {
  if (!muscle) continue;
  if (!REVERSE_MUSCLE_MAP[muscle]) REVERSE_MUSCLE_MAP[muscle] = [];
  REVERSE_MUSCLE_MAP[muscle].push(mg);
}

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

const TIER_COLORS = [
  '#4a6670', // tier 1: dim blue-gray
  '#22c55e', // tier 2: green
  '#eab308', // tier 3: yellow
  '#f97316', // tier 4: orange
  '#ef4444', // tier 5: red
];

const TIER_LABELS = [
  { color: '#ef4444', label: 'Highest' },
  { color: '#f97316', label: 'High' },
  { color: '#eab308', label: 'Moderate' },
  { color: '#22c55e', label: 'Low' },
  { color: '#4a6670', label: 'Minimal' },
];

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

  // 1. Aggregate volumes per library-muscle
  const muscleVolumes = new Map<Muscle, number>();
  for (const d of distribution) {
    const mapped = MUSCLE_MAP[d.muscleGroup as MuscleGroup];
    if (!mapped) continue;
    muscleVolumes.set(mapped, (muscleVolumes.get(mapped) ?? 0) + d.volume);
  }

  // 2. Normalize
  const maxVol = Math.max(...muscleVolumes.values(), 1);

  // 3. Tier assignment
  const tieredData: IExerciseData[] = [];
  for (const [muscle, vol] of muscleVolumes) {
    const ratio = vol / maxVol;
    let tier: number;
    if (ratio > 0.85) tier = 5;
    else if (ratio > 0.65) tier = 4;
    else if (ratio > 0.40) tier = 3;
    else if (ratio > 0.20) tier = 2;
    else tier = 1;

    tieredData.push({
      name: `tier-${tier}`,
      muscles: [muscle],
      frequency: tier,
    });
  }

  // Get tier color for the selected muscle (for the drill-down header accent)
  const selectedTierColor = selectedMuscle
    ? (() => {
        const vol = muscleVolumes.get(selectedMuscle) ?? 0;
        const ratio = vol / maxVol;
        if (ratio > 0.85) return TIER_COLORS[4];
        if (ratio > 0.65) return TIER_COLORS[3];
        if (ratio > 0.40) return TIER_COLORS[2];
        if (ratio > 0.20) return TIER_COLORS[1];
        return TIER_COLORS[0];
      })()
    : undefined;

  const selectedLabel = selectedMuscle
    ? MUSCLE_LABELS[selectedMuscle] ?? selectedMuscle
    : '';

  const formatVolume = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`;
    return `${kg}`;
  };

  const theme = useSetting('theme');
  const bodyColor = theme === 'light' ? '#c8c8c8' : '#3a3a3a';

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
