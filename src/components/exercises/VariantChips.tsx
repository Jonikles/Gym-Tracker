import { memo, useState } from 'react';
import {
  findFamilyForExerciseName,
  isOptionAvailable,
  resolveVariant,
  type ExerciseFamily,
} from '../../data/exercise-families';
import {
  formatFamilyParams,
  getOrCreateVariantExercise,
  selectFamilyOption,
} from '../../utils/exerciseFamilies';
import type { Exercise } from '../../types';
import styles from './VariantChips.module.css';

interface FamilyParamSelectorProps {
  family: ExerciseFamily;
  params: Record<string, string>;
  onChange: (params: Record<string, string>) => void;
  /** 'large' = 44px chips (picker), 'compact' = smaller chips (inline on cards) */
  size?: 'large' | 'compact';
  disabled?: boolean;
}

/** One row of chip buttons per family dimension. Invalid combinations are disabled. */
export function FamilyParamSelector({ family, params, onChange, size = 'large', disabled }: FamilyParamSelectorProps) {
  return (
    <div className={`${styles.selector} ${size === 'compact' ? styles.compact : ''}`}>
      {family.dimensions.map((d, dimIndex) => {
        // Options are checked against the selections ABOVE this row: incompatible
        // ones are disabled. Picking an option that conflicts with a row BELOW
        // auto-switches that row to its first valid option (selectFamilyOption).
        const above: Record<string, string> = {};
        for (const prev of family.dimensions.slice(0, dimIndex)) {
          if (params[prev.key] !== undefined) above[prev.key] = params[prev.key];
        }
        return (
        <div key={d.key} className={styles.dimension} role="radiogroup" aria-label={d.label}>
          <span className={styles.dimensionLabel}>{d.label}</span>
          <div className={styles.chips}>
            {d.options.map((o) => {
              const selected = params[d.key] === o.value;
              const available = isOptionAvailable(family, above, d.key, o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                  disabled={disabled || (!available && !selected)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!selected) onChange(selectFamilyOption(family, params, d.key, o.value));
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}

interface VariantChipsProps {
  /** The current concrete exercise */
  exercise: Exercise;
  /** Called with the new concrete exercise when the user picks another combination */
  onChange: (exercise: Exercise) => void | Promise<void>;
  /** Start expanded (chips visible) instead of the one-line summary */
  defaultExpanded?: boolean;
}

/**
 * Compact variant switcher for a family exercise: a one-line summary
 * ("Incline · Dumbbell ▾") that expands into chip rows on tap.
 * Renders nothing for standalone exercises.
 */
export const VariantChips = memo(function VariantChips({ exercise, onChange, defaultExpanded = false }: VariantChipsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [pending, setPending] = useState(false);
  const membership = findFamilyForExerciseName(exercise.name);
  if (!membership) return null;
  const { family, params } = membership;

  const handleChange = async (next: Record<string, string>) => {
    if (!resolveVariant(family, next)) return;
    setPending(true);
    try {
      const concrete = await getOrCreateVariantExercise(family, next);
      if (concrete && concrete.id !== exercise.id) await onChange(concrete);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.variantChips}>
      <button
        type="button"
        className={styles.summary}
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((x) => !x);
        }}
        aria-expanded={expanded}
        title={exercise.name}
      >
        <span className={styles.summaryText}>{formatFamilyParams(family, params)}</span>
        <span className={styles.summaryChevron} aria-hidden="true">{expanded ? '▴' : '▾'}</span>
      </button>
      {expanded && (
        <FamilyParamSelector
          family={family}
          params={params}
          onChange={handleChange}
          size="compact"
          disabled={pending}
        />
      )}
    </div>
  );
});

