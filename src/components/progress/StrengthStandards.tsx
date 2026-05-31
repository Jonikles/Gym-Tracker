import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '../common';
import { db } from '../../db';
import { useSetting } from '../../hooks/useSettings';
import { usePersistedState } from '../../hooks/usePersistedState';
import {
  MALE_STANDARDS,
  FEMALE_STANDARDS,
  STRENGTH_LEVELS,
  LEVEL_LABELS,
  LEVEL_COLORS,
  BIG3_EXERCISES,
  BIG3_LABELS,
  getStrengthLevel,
  type Big3Lift,
  type StrengthStandard,
} from '../../data/strength-standards';
import styles from './StrengthStandards.module.css';

type Gender = 'male' | 'female';

interface LiftData {
  lift: Big3Lift;
  exerciseId: string | null;
  e1rm: number;
  bestWeight: number;
  bestReps: number;
}

/**
 * Hook to find Big 3 exercise IDs by name and get their best e1RM PRs
 */
function useBig3Data(): LiftData[] {
  const data = useLiveQuery(async () => {
    const results: LiftData[] = [];

    for (const [lift, name] of Object.entries(BIG3_EXERCISES) as [Big3Lift, string][]) {
      // Find exercise by exact name
      const exercise = await db.exercises
        .filter((e) => e.name === name)
        .first();

      if (!exercise) {
        results.push({ lift, exerciseId: null, e1rm: 0, bestWeight: 0, bestReps: 0 });
        continue;
      }

      // Get e1rm PR for this exercise
      const prs = await db.prs
        .where('exerciseId')
        .equals(exercise.id)
        .toArray();

      const e1rmPR = prs
        .filter((pr) => pr.type === 'e1rm')
        .sort((a, b) => b.value - a.value)[0];

      const weightPR = prs
        .filter((pr) => pr.type === 'weight')
        .sort((a, b) => b.value - a.value)[0];

      // Use e1rm PR if available, otherwise use weight PR as the 1RM estimate
      const e1rm = e1rmPR?.value ?? weightPR?.value ?? 0;

      results.push({
        lift,
        exerciseId: exercise.id,
        e1rm,
        bestWeight: weightPR?.value ?? 0,
        bestReps: 0,
      });
    }

    return results;
  }, []);

  return data ?? [
    { lift: 'squat', exerciseId: null, e1rm: 0, bestWeight: 0, bestReps: 0 },
    { lift: 'bench', exerciseId: null, e1rm: 0, bestWeight: 0, bestReps: 0 },
    { lift: 'deadlift', exerciseId: null, e1rm: 0, bestWeight: 0, bestReps: 0 },
  ];
}

interface LiftCardProps {
  data: LiftData;
  bodyweight: number;
  standards: StrengthStandard;
}

function LiftCardContent({ data, bodyweight, standards }: LiftCardProps) {
  const [showStandards, setShowStandards] = useState(false);
  const { level, ratio } = getStrengthLevel(data.e1rm, bodyweight, standards);

  // Calculate progress bar fill percentage across all levels
  const totalProgress = useMemo(() => {
    if (data.e1rm <= 0 || bodyweight <= 0) return 0;
    const maxRatio = standards.elite * 1.1; // 10% beyond elite for visual headroom
    return Math.min(100, (ratio / maxRatio) * 100);
  }, [data.e1rm, bodyweight, ratio, standards.elite]);

  // Marker positions for level thresholds
  const markers = useMemo(() => {
    const maxRatio = standards.elite * 1.1;
    return STRENGTH_LEVELS.map((lvl) => ({
      level: lvl,
      position: (standards[lvl] / maxRatio) * 100,
    }));
  }, [standards]);

  return (
    <Card className={styles.liftCard}>
      <div className={styles.liftHeader}>
        <span className={styles.liftName}>{BIG3_LABELS[data.lift]}</span>
        {data.e1rm > 0 ? (
          <div className={styles.liftValue}>
            <span className={styles.liftE1rm}>{Math.round(data.e1rm)} kg</span>
            <span className={styles.liftRatio}>{ratio.toFixed(2)}x BW</span>
          </div>
        ) : (
          <span className={styles.noData}>No data yet</span>
        )}
      </div>

      {data.e1rm > 0 && bodyweight > 0 && (
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${totalProgress}%`,
                backgroundColor: LEVEL_COLORS[level],
              }}
            />
            {markers.map((m) => (
              <div
                key={m.level}
                className={styles.progressMarker}
                style={{ left: `${m.position}%` }}
              />
            ))}
          </div>
          <div className={styles.levelLabels}>
            {STRENGTH_LEVELS.map((lvl) => (
              <span
                key={lvl}
                className={`${styles.levelLabel} ${lvl === level ? styles.levelLabelActive : ''}`}
                style={lvl === level ? { color: LEVEL_COLORS[lvl] } : undefined}
              >
                {LEVEL_LABELS[lvl]}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.e1rm > 0 && bodyweight > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            className={styles.levelBadge}
            style={{
              backgroundColor: `${LEVEL_COLORS[level]}20`,
              color: LEVEL_COLORS[level],
            }}
          >
            {LEVEL_LABELS[level]}
          </span>
          <button
            className={styles.standardsToggle}
            onClick={() => setShowStandards(!showStandards)}
          >
            {showStandards ? 'Hide targets' : 'Show targets'}
          </button>
        </div>
      )}

      {showStandards && bodyweight > 0 && (
        <div className={styles.standardsGrid}>
          {STRENGTH_LEVELS.map((lvl) => (
            <div
              key={lvl}
              className={`${styles.standardCell} ${lvl === level ? styles.standardCellActive : ''}`}
              style={lvl === level ? { color: LEVEL_COLORS[lvl] } : undefined}
            >
              <span className={styles.standardCellLabel}>{LEVEL_LABELS[lvl]}</span>
              <span className={styles.standardCellValue}>
                {Math.round(standards[lvl] * bodyweight)} kg
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function StrengthStandards() {
  const navigate = useNavigate();
  const bodyweight = useSetting('bodyweight');
  const [gender, setGender] = usePersistedState<Gender>('strength.gender', 'male');
  const big3Data = useBig3Data();

  const standards = gender === 'male' ? MALE_STANDARDS : FEMALE_STANDARDS;

  const totalE1RM = big3Data.reduce((sum, d) => sum + d.e1rm, 0);
  const hasAnyData = big3Data.some((d) => d.e1rm > 0);

  // Overall level based on total
  const totalStandard = useMemo(() => {
    if (!bodyweight || bodyweight <= 0) return null;
    // Combined standard: sum of individual thresholds
    const combined: StrengthStandard = {
      beginner: standards.squat.beginner + standards.bench.beginner + standards.deadlift.beginner,
      novice: standards.squat.novice + standards.bench.novice + standards.deadlift.novice,
      intermediate: standards.squat.intermediate + standards.bench.intermediate + standards.deadlift.intermediate,
      advanced: standards.squat.advanced + standards.bench.advanced + standards.deadlift.advanced,
      elite: standards.squat.elite + standards.bench.elite + standards.deadlift.elite,
    };
    return getStrengthLevel(totalE1RM, bodyweight, combined);
  }, [totalE1RM, bodyweight, standards]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Big 3 Standards</h2>
        <div className={styles.genderToggle}>
          <button
            className={`${styles.genderBtn} ${gender === 'male' ? styles.genderBtnActive : ''}`}
            onClick={() => setGender('male')}
          >
            Male
          </button>
          <button
            className={`${styles.genderBtn} ${gender === 'female' ? styles.genderBtnActive : ''}`}
            onClick={() => setGender('female')}
          >
            Female
          </button>
        </div>
      </div>

      {(!bodyweight || bodyweight <= 0) && (
        <Card>
          <p className={styles.setupPrompt}>
            Set your bodyweight in{' '}
            <button className={styles.setupLink} onClick={() => navigate('/settings')}>
              Settings
            </button>{' '}
            to see how you compare.
          </p>
        </Card>
      )}

      {bodyweight > 0 && hasAnyData && totalStandard && (
        <Card className={styles.totalCard}>
          <span className={styles.totalLabel}>Estimated Total</span>
          <span className={styles.totalValue} style={{ color: LEVEL_COLORS[totalStandard.level] }}>
            {Math.round(totalE1RM)}
            <span className={styles.totalUnit}> kg</span>
          </span>
          <span className={styles.totalRatio}>{totalStandard.ratio.toFixed(2)}x bodyweight</span>
          <span
            className={styles.levelBadge}
            style={{
              backgroundColor: `${LEVEL_COLORS[totalStandard.level]}20`,
              color: LEVEL_COLORS[totalStandard.level],
            }}
          >
            {LEVEL_LABELS[totalStandard.level]}
          </span>
        </Card>
      )}

      <div className={styles.lifts}>
        {big3Data.map((data) => (
          <LiftCardContent
            key={data.lift}
            data={data}
            bodyweight={bodyweight}
            standards={standards[data.lift]}
          />
        ))}
      </div>
    </div>
  );
}
