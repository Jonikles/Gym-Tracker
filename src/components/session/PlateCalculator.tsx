import { useState, useMemo } from 'react';
import { Modal, Input } from '../common';
import styles from './PlateCalculator.module.css';

// Standard plate weights (kg) and their display colors
const AVAILABLE_PLATES = [
  { weight: 25, color: '#ef4444', label: '25' },
  { weight: 20, color: '#3b82f6', label: '20' },
  { weight: 15, color: '#eab308', label: '15' },
  { weight: 10, color: '#22c55e', label: '10' },
  { weight: 5, color: '#f5f5f5', label: '5' },
  { weight: 2.5, color: '#ef4444', label: '2.5' },
  { weight: 1.25, color: '#f5f5f5', label: '1.25' },
  { weight: 0.5, color: '#22c55e', label: '0.5' },
];

const DEFAULT_BAR_WEIGHT = 20;

interface PlateResult {
  weight: number;
  color: string;
  label: string;
  count: number;
}

function calculatePlates(targetWeight: number, barWeight: number): PlateResult[] | null {
  const weightPerSide = (targetWeight - barWeight) / 2;
  if (weightPerSide < 0) return null;
  if (weightPerSide === 0) return [];

  const plates: PlateResult[] = [];
  let remaining = weightPerSide;

  for (const plate of AVAILABLE_PLATES) {
    if (remaining >= plate.weight) {
      const count = Math.floor(remaining / plate.weight);
      plates.push({
        weight: plate.weight,
        color: plate.color,
        label: plate.label,
        count,
      });
      remaining -= count * plate.weight;
    }
  }

  // Check if we reached exact weight (within floating point tolerance)
  if (remaining > 0.01) return null;

  return plates;
}

interface PlateCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number;
  onSelectWeight?: (weight: number) => void;
}

export function PlateCalculator({ isOpen, onClose, initialWeight, onSelectWeight }: PlateCalculatorProps) {
  const [targetWeight, setTargetWeight] = useState(initialWeight?.toString() ?? '');
  const [barWeight, setBarWeight] = useState(DEFAULT_BAR_WEIGHT.toString());

  // Recalculate when initialWeight changes (new modal open)
  useState(() => {
    if (initialWeight) setTargetWeight(initialWeight.toString());
  });

  const target = parseFloat(targetWeight) || 0;
  const bar = parseFloat(barWeight) || 0;

  const plates = useMemo(() => {
    if (target <= 0 || bar <= 0 || target < bar) return null;
    return calculatePlates(target, bar);
  }, [target, bar]);

  const totalPlateWeight = plates
    ? plates.reduce((sum, p) => sum + p.weight * p.count, 0) * 2
    : 0;

  // Quick weight buttons
  const quickWeights = [40, 60, 80, 100, 120, 140];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Plate Calculator">
      <div className={styles.container}>
        {/* Inputs */}
        <div className={styles.inputRow}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Target Weight</label>
            <Input
              type="text"
              inputMode="decimal"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="kg"
              autoFocus
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Bar Weight</label>
            <Input
              type="text"
              inputMode="decimal"
              value={barWeight}
              onChange={(e) => setBarWeight(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="kg"
            />
          </div>
        </div>

        {/* Quick weight buttons */}
        <div className={styles.quickWeights}>
          {quickWeights.map((w) => (
            <button
              key={w}
              className={`${styles.quickBtn} ${parseFloat(targetWeight) === w ? styles.quickBtnActive : ''}`}
              onClick={() => setTargetWeight(w.toString())}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Results */}
        {target > 0 && target >= bar && (
          <div className={styles.results}>
            {plates === null ? (
              <div className={styles.error}>
                Cannot make {target}kg exactly with available plates
              </div>
            ) : plates.length === 0 ? (
              <div className={styles.barOnly}>
                Bar only ({bar}kg)
              </div>
            ) : (
              <>
                {/* Visual barbell */}
                <div className={styles.barbellWrapper}>
                  <div className={styles.barbell}>
                    {/* Left side plates (reversed for visual) */}
                    <div className={styles.platesSide}>
                      {[...plates].reverse().map((plate, i) =>
                        Array.from({ length: plate.count }, (_, j) => (
                          <div
                            key={`l-${i}-${j}`}
                            className={styles.plate}
                            style={{
                              backgroundColor: plate.color,
                              height: `${Math.max(30, 20 + plate.weight * 2)}px`,
                              width: `${Math.max(8, 4 + plate.weight * 0.5)}px`,
                            }}
                          />
                        ))
                      )}
                    </div>
                    {/* Bar center */}
                    <div className={styles.barCenter}>
                      <span className={styles.barLabel}>{bar}kg</span>
                    </div>
                    {/* Right side plates */}
                    <div className={styles.platesSide}>
                      {plates.map((plate, i) =>
                        Array.from({ length: plate.count }, (_, j) => (
                          <div
                            key={`r-${i}-${j}`}
                            className={styles.plate}
                            style={{
                              backgroundColor: plate.color,
                              height: `${Math.max(30, 20 + plate.weight * 2)}px`,
                              width: `${Math.max(8, 4 + plate.weight * 0.5)}px`,
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Plate breakdown */}
                <div className={styles.breakdown}>
                  <div className={styles.breakdownHeader}>
                    <span>Per Side</span>
                    <span className={styles.breakdownTotal}>
                      Total: {bar + totalPlateWeight}kg
                    </span>
                  </div>
                  {plates.map((plate) => (
                    <div key={plate.weight} className={styles.breakdownRow}>
                      <div
                        className={styles.breakdownSwatch}
                        style={{ backgroundColor: plate.color }}
                      />
                      <span className={styles.breakdownWeight}>{plate.label}kg</span>
                      <span className={styles.breakdownCount}>
                        {plate.count === 1 ? '1 plate' : `${plate.count} plates`}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {target > 0 && target < bar && (
          <div className={styles.error}>
            Target weight must be at least {bar}kg (bar weight)
          </div>
        )}

        {/* Use weight button */}
        {onSelectWeight && target > 0 && plates !== null && (
          <button
            className={styles.useBtn}
            onClick={() => {
              onSelectWeight(target);
              onClose();
            }}
          >
            Use {target}kg
          </button>
        )}
      </div>
    </Modal>
  );
}
