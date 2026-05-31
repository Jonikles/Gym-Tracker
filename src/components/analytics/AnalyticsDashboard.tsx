import { useState, useRef } from 'react';
import { StatsCards } from './StatsCards';
import { VolumeChart } from './VolumeChart';
import { FrequencyChart } from './FrequencyChart';
import { MuscleChart } from './MuscleChart';
import { MuscleHeatmap } from './MuscleHeatmap';
import { ExportCard, type ExportCardHandle } from './ExportCard';
import styles from './Analytics.module.css';

export type TimePeriod = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'All' },
];

/** Convert a TimePeriod to a number of days (0 = all time) */
export function periodToDays(period: TimePeriod): number {
  switch (period) {
    case '1W': return 7;
    case '1M': return 30;
    case '3M': return 90;
    case '6M': return 182;
    case '1Y': return 365;
    case 'ALL': return 0;
  }
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('3M');
  const days = periodToDays(period);
  const exportRef = useRef<ExportCardHandle>(null);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Analytics</h1>
        <button
          className={styles.exportBtn}
          onClick={() => exportRef.current?.exportImage()}
          title="Export as image"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </button>
      </header>

      <div className={styles.periodBar}>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.periodBtn} ${period === opt.value ? styles.periodActive : ''}`}
            onClick={() => setPeriod(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <StatsCards days={days} />

      <MuscleHeatmap days={days} />

      <div className={styles.chartsGrid}>
        <VolumeChart days={days} />
        <FrequencyChart days={days} />
        <MuscleChart days={days} />
      </div>

      <ExportCard ref={exportRef} days={days} period={period} />
    </div>
  );
}
