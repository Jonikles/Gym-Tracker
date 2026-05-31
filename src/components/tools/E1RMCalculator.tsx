import { useState, useMemo } from 'react';
import { Input, Card } from '../common';
import styles from './E1RMCalculator.module.css';

/**
 * Various 1RM estimation formulas
 */
const formulas: Record<string, (w: number, r: number) => number> = {
  Epley: (w, r) => w * (1 + r / 30),
  Brzycki: (w, r) => w * (36 / (37 - r)),
  Lombardi: (w, r) => w * Math.pow(r, 0.1),
  'O\'Conner': (w, r) => w * (1 + r * 0.025),
  Mayhew: (w, r) => (100 * w) / (52.2 + 41.9 * Math.exp(-0.055 * r)),
  Wathan: (w, r) => (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r)),
};

/**
 * Rep ranges for percentage table
 */
const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
const APPROX_REPS: Record<number, string> = {
  100: '1',
  95: '2',
  90: '3-4',
  85: '5-6',
  80: '7-8',
  75: '9-10',
  70: '11-12',
  65: '13-15',
  60: '16-18',
  55: '19-22',
  50: '23+',
};

export function E1RMCalculator() {
  const [weightStr, setWeightStr] = useState('');
  const [repsStr, setRepsStr] = useState('');

  const weight = parseFloat(weightStr) || 0;
  const reps = parseInt(repsStr, 10) || 0;
  const isValid = weight > 0 && reps > 0;
  const isHighReps = reps > 10;

  // Calculate all formulas
  const results = useMemo(() => {
    if (!isValid) return null;
    if (reps === 1) {
      // 1 rep = actual 1RM, all formulas agree
      const map: Record<string, number> = {};
      for (const name of Object.keys(formulas)) {
        map[name] = weight;
      }
      return map;
    }
    const map: Record<string, number> = {};
    for (const [name, fn] of Object.entries(formulas)) {
      map[name] = fn(weight, reps);
    }
    return map;
  }, [weight, reps, isValid]);

  // Primary result (Epley average)
  const primaryE1RM = results ? results['Epley'] : 0;

  // Average across all formulas
  const averageE1RM = results
    ? Object.values(results).reduce((s, v) => s + v, 0) / Object.values(results).length
    : 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>1RM Calculator</h1>
      </header>

      <Card>
        <div className={styles.inputSection}>
          <div className={styles.inputRow}>
            <Input
              label="Weight (kg)"
              type="text"
              inputMode="decimal"
              placeholder="100"
              value={weightStr}
              onChange={(e) => {
                setWeightStr(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1'));
              }}
              autoFocus
            />
            <Input
              label="Reps performed"
              type="text"
              inputMode="numeric"
              placeholder="5"
              value={repsStr}
              onChange={(e) => {
                setRepsStr(e.target.value.replace(/[^0-9]/g, ''));
              }}
            />
          </div>
        </div>
      </Card>

      {isHighReps && (
        <div className={styles.warning}>
          Estimates become less accurate above 10 reps. Use with caution.
        </div>
      )}

      {isValid && primaryE1RM > 0 && (
        <>
          <Card className={styles.resultCard}>
            <span className={styles.resultLabel}>Estimated 1RM</span>
            <span className={styles.resultValue}>
              {Math.round(averageE1RM)}
              <span className={styles.resultUnit}> kg</span>
            </span>
            <span className={styles.resultNote}>
              Average across {Object.keys(formulas).length} formulas
            </span>
          </Card>

          <div className={styles.formulaSection}>
            <span className={styles.formulaTitle}>By Formula</span>
            <div className={styles.formulaGrid}>
              {Object.entries(results!).map(([name, value]) => (
                <div key={name} className={styles.formulaRow}>
                  <span className={styles.formulaName}>{name}</span>
                  <span className={styles.formulaValue}>{value.toFixed(1)} kg</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.percentSection}>
            <span className={styles.percentTitle}>Training Loads (% of 1RM)</span>
            <div className={styles.percentTable}>
              {PERCENTAGES.map((pct) => (
                <div key={pct} className={styles.percentCell}>
                  <div>
                    <span className={styles.percentLabel}>{pct}%</span>
                    <span className={styles.percentReps}> ~{APPROX_REPS[pct]} reps</span>
                  </div>
                  <span className={styles.percentWeight}>
                    {Math.round(averageE1RM * pct / 100)} kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
