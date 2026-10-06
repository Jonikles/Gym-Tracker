import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useSetting } from '../../hooks/useSettings';
import {
  MALE_STANDARDS,
  STRENGTH_LEVELS,
  LEVEL_LABELS,
  BIG3_EXERCISES,
  BIG3_LABELS,
  getStrengthLevel,
  type Big3Lift,
  type StrengthStandard,
  type StrengthLevel,
} from '../../data/strength-standards';
import styles from './StrengthStandards.module.css';

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
      // Find exercise by exact name (indexed)
      const exercise = await db.exercises.where('name').equals(name).first();

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

/** Level → global chip variant (token colors, not the data file's literal palette) */
const LEVEL_CHIP: Record<StrengthLevel, string> = {
  beginner: 'chip',
  novice: 'chip chip-accent',
  intermediate: 'chip chip-success',
  advanced: 'chip chip-warning',
  elite: 'chip chip-pr',
};

interface LiftCardProps {
  data: LiftData;
  bodyweight: number;
  standards: StrengthStandard;
}

function LiftCardContent({ data, bodyweight, standards }: LiftCardProps) {
  const [showStandards, setShowStandards] = useState(false);
  const { level, ratio } = getStrengthLevel(data.e1rm, bodyweight, standards);
  const hasLevel = data.e1rm > 0 && bodyweight > 0;

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
    <div className={`surface ${styles.liftCard}`}>
      <div className={styles.liftHeader}>
        <div className={styles.liftTitle}>
          <span className={styles.liftName}>{BIG3_LABELS[data.lift]}</span>
          {hasLevel && <span className={LEVEL_CHIP[level]}>{LEVEL_LABELS[level]}</span>}
        </div>
        {data.e1rm > 0 ? (
          <div className={styles.liftValue}>
            <span className={styles.liftE1rm}>
              <span className="num">{Math.round(data.e1rm)}</span>
              <span className={styles.unit}>kg</span>
            </span>
            {bodyweight > 0 && (
              <span className={styles.liftRatio}>
                <span className="num">{ratio.toFixed(2)}</span>× BW
              </span>
            )}
          </div>
        ) : (
          <span className={styles.noData}>No data yet</span>
        )}
      </div>

      {hasLevel && (
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${totalProgress}%` }} />
            {markers.map((m) => (
              <div key={m.level} className={styles.progressMarker} style={{ left: `${m.position}%` }} />
            ))}
          </div>
          <div className={styles.levelLabels}>
            {STRENGTH_LEVELS.map((lvl) => (
              <span key={lvl} className={`${styles.levelLabel} ${lvl === level ? styles.levelLabelActive : ''}`}>
                {LEVEL_LABELS[lvl]}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasLevel && (
        <button
          type="button"
          className={styles.standardsToggle}
          onClick={() => setShowStandards(!showStandards)}
          aria-expanded={showStandards}
        >
          {showStandards ? 'Hide targets (kg) ▴' : 'Show targets (kg) ▾'}
        </button>
      )}

      {showStandards && bodyweight > 0 && (
        <div className={styles.standardsGrid}>
          {STRENGTH_LEVELS.map((lvl) => (
            <div key={lvl} className={`${styles.standardCell} ${lvl === level ? styles.standardCellActive : ''}`}>
              <span className={styles.standardCellLabel}>{LEVEL_LABELS[lvl]}</span>
              <span className={`num ${styles.standardCellValue}`}>{Math.round(standards[lvl] * bodyweight)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StrengthStandards() {
  const navigate = useNavigate();
  const bodyweight = useSetting('bodyweight');
  const big3Data = useBig3Data();

  const standards = MALE_STANDARDS;

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
    <section className={styles.container} aria-label="Big 3 standards">
      <h2 className="section-title">Big 3 standards</h2>

      {(!bodyweight || bodyweight <= 0) && (
        <div className={`surface ${styles.setupPrompt}`}>
          Set your bodyweight in{' '}
          <button type="button" className={styles.setupLink} onClick={() => navigate('/settings')}>
            Settings
          </button>{' '}
          to see how you compare.
        </div>
      )}

      {bodyweight > 0 && hasAnyData && totalStandard && (
        <div className={`surface-hero ${styles.totalCard}`}>
          <div className={styles.totalMain}>
            <span className="eyebrow">Estimated total</span>
            <span className={styles.totalValue}>
              <span className="stat-value">{Math.round(totalE1RM)}</span>
              <span className={styles.totalUnit}>kg</span>
            </span>
            <span className={styles.totalRatio}>
              <span className="num">{totalStandard.ratio.toFixed(2)}</span>× bodyweight
            </span>
          </div>
          <span className={LEVEL_CHIP[totalStandard.level]}>{LEVEL_LABELS[totalStandard.level]}</span>
        </div>
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
    </section>
  );
}
