import { useMemo } from 'react';
import { Input, Select, Button } from '../common';
import type { HistoryFilters } from './useHistoryFilters';
import { formatDateInputValue } from '../common/format';
import styles from './SessionHistory.module.css';

interface HistoryFilterPanelProps {
  filters: HistoryFilters;
}

/** Search box (always visible) + one collapsible "Filters" panel with an active-count badge */
export function HistoryFilterPanel({ filters: f }: HistoryFilterPanelProps) {
  // Today as YYYY-MM-DD for date input max constraint
  const todayStr = useMemo(() => formatDateInputValue(new Date()), []);

  return (
    <div className={styles.filters}>
      <div className={styles.searchRow}>
        <div className={styles.searchInput}>
          <Input
            type="search"
            placeholder="Search workouts…"
            value={f.searchQuery}
            onChange={(e) => f.setSearchQuery(e.target.value)}
            aria-label="Search workouts"
          />
        </div>
        <button
          type="button"
          className={`${styles.filtersToggle} ${f.filtersOpen ? styles.filtersToggleOpen : ''}`}
          onClick={() => f.setFiltersOpen(!f.filtersOpen)}
          aria-expanded={f.filtersOpen}
        >
          Filters
          {f.panelFilterCount > 0 && <span className={styles.filterBadge}>{f.panelFilterCount}</span>}
          <span className={styles.chevron} aria-hidden="true">{f.filtersOpen ? '▲' : '▼'}</span>
        </button>
      </div>

      {f.filtersOpen && (
        <div className={styles.filterPanel}>
          <div className={styles.filterGrid}>
            <div className={styles.prFilter}>
              <label className={styles.filterLabel}>Routine</label>
              <Select
                value={f.routineFilter}
                onChange={(e) => f.setRoutineFilter(e.target.value)}
                options={[
                  { value: 'blank', label: 'Blank Workouts' },
                  ...f.routines.map((r) => ({ value: r.id, label: r.name })),
                ]}
                placeholder="All routines"
              />
            </div>
            <div className={styles.prFilter}>
              <label className={styles.filterLabel}>Date</label>
              <Select
                value={f.dateFilter}
                onChange={(e) => {
                  f.setDateFilter(e.target.value);
                  if (e.target.value !== 'custom') {
                    f.setDateFrom('');
                    f.setDateTo('');
                  }
                }}
                options={[
                  { value: 'week', label: 'Past Week' },
                  { value: 'month', label: 'Past Month' },
                  { value: '3months', label: 'Past 3 Months' },
                  { value: '6months', label: 'Past 6 Months' },
                  { value: 'year', label: 'Past Year' },
                  { value: 'custom', label: 'Custom Range...' },
                ]}
                placeholder="All time"
              />
            </div>
          </div>

          {f.isCustomRange && (
            <div className={styles.customDateRow}>
              <div className={styles.dateField}>
                <label className={styles.filterLabel}>From</label>
                <Input
                  type="date"
                  value={f.dateFrom}
                  onChange={(e) => f.setDateFrom(e.target.value)}
                  max={f.dateTo || todayStr}
                />
              </div>
              <div className={styles.dateField}>
                <label className={styles.filterLabel}>To</label>
                <Input
                  type="date"
                  value={f.dateTo}
                  onChange={(e) => f.setDateTo(e.target.value)}
                  min={f.dateFrom || undefined}
                  max={todayStr}
                />
              </div>
            </div>
          )}

          <div className={styles.filterGrid}>
            <div className={styles.rangeFilter}>
              <label className={styles.filterLabel}>Duration (min)</label>
              <div className={styles.rangeInputs}>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Min"
                  value={f.minDuration}
                  onChange={(e) => f.setMinDuration(e.target.value)}
                  min={0}
                />
                <span className={styles.rangeSeparator}>–</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Max"
                  value={f.maxDuration}
                  onChange={(e) => f.setMaxDuration(e.target.value)}
                  min={0}
                />
              </div>
            </div>
            <div className={styles.rangeFilter}>
              <label className={styles.filterLabel}>Sets</label>
              <div className={styles.rangeInputs}>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Min"
                  value={f.minSets}
                  onChange={(e) => f.setMinSets(e.target.value)}
                  min={0}
                />
                <span className={styles.rangeSeparator}>–</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Max"
                  value={f.maxSets}
                  onChange={(e) => f.setMaxSets(e.target.value)}
                  min={0}
                />
              </div>
            </div>
            <div className={styles.prFilter}>
              <label className={styles.filterLabel}>PR</label>
              <Select
                value={f.prFilter}
                onChange={(e) => {
                  f.setPrFilter(e.target.value);
                  if (!e.target.value || e.target.value === 'none') f.setPrExerciseFilter('');
                }}
                options={[
                  { value: 'any', label: 'Any PR' },
                  { value: 'none', label: 'No PR' },
                  { value: 'weight', label: 'Weight PR' },
                  { value: 'reps', label: 'Reps PR' },
                  { value: 'progression', label: 'Progression' },
                ]}
                placeholder="All"
              />
            </div>
            {f.prFilter && f.prFilter !== 'none' && (
              <div className={styles.prFilter}>
                <label className={styles.filterLabel}>PR exercise</label>
                <Select
                  value={f.prExerciseFilter}
                  onChange={(e) => f.setPrExerciseFilter(e.target.value)}
                  options={(f.exercisesWithPRs ?? []).map((ex) => ({ value: ex.id, label: ex.name }))}
                  placeholder="All exercises"
                />
              </div>
            )}
          </div>

          {/* Exercise multi-select — collapsible chip section */}
          <div className={styles.exerciseFilterSection}>
            <button
              type="button"
              className={styles.exerciseFilterToggle}
              onClick={() => f.setIsExerciseFilterOpen(!f.isExerciseFilterOpen)}
              aria-expanded={f.isExerciseFilterOpen}
            >
              <span className={styles.exerciseFilterLabel}>
                Exercises{f.exerciseFilters.length > 0 ? `: ${f.exerciseFilters.length} selected` : ''}
              </span>
              <span className={styles.chevron} aria-hidden="true">{f.isExerciseFilterOpen ? '▲' : '▼'}</span>
            </button>

            {f.isExerciseFilterOpen && (
              <div className={styles.exerciseFilterDropdown}>
                {f.exerciseFilters.length > 1 && (
                  <div className={styles.filterModeRow}>
                    <span className={styles.filterModeLabel}>Match:</span>
                    <div className={styles.filterModeToggle}>
                      <button
                        type="button"
                        className={`${styles.modeButton} ${f.exerciseFilterMode === 'any' ? styles.modeActive : ''}`}
                        onClick={() => f.setExerciseFilterMode('any')}
                      >
                        ANY
                      </button>
                      <button
                        type="button"
                        className={`${styles.modeButton} ${f.exerciseFilterMode === 'all' ? styles.modeActive : ''}`}
                        onClick={() => f.setExerciseFilterMode('all')}
                      >
                        ALL
                      </button>
                    </div>
                  </div>
                )}
                <Input
                  placeholder="Search exercises..."
                  value={f.exerciseSearchQuery}
                  onChange={(e) => f.setExerciseSearchQuery(e.target.value)}
                />
                <div className={styles.exerciseChips}>
                  {f.filteredExerciseChips.map((ex) => (
                    <button
                      type="button"
                      key={ex.id}
                      className={`${styles.exerciseChip} ${f.exerciseFilters.includes(ex.id) ? styles.exerciseChipActive : ''}`}
                      onClick={() => f.toggleExerciseFilter(ex.id)}
                    >
                      {ex.name}
                    </button>
                  ))}
                  {f.filteredExerciseChips.length === 0 && (
                    <span className={styles.noChips}>No exercises match</span>
                  )}
                </div>
                {f.exerciseFilters.length > 0 && (
                  <button
                    type="button"
                    className={styles.clearChipsBtn}
                    onClick={() => { f.setExerciseFilters([]); f.setExerciseSearchQuery(''); }}
                  >
                    Clear exercise filters
                  </button>
                )}
              </div>
            )}
          </div>

          {f.hasFilters && (
            <Button variant="ghost" onClick={f.clearFilters} className={styles.clearBtn}>
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
