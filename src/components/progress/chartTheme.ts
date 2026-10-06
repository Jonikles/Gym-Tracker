/** Shared recharts styling (progress + analytics), all from design tokens */
export const CHART_AXIS_TICK = { fill: 'var(--color-text-muted)', fontSize: 11 };
export const CHART_GRID_STROKE = 'rgba(255, 255, 255, 0.05)';
export const CHART_TOOLTIP_PROPS = {
  contentStyle: {
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    fontSize: 'var(--text-sm)',
    padding: '6px 10px',
  },
  labelStyle: { color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: 2 },
  itemStyle: { color: 'var(--color-text)', fontWeight: 650, padding: 0 },
  cursor: { stroke: 'var(--color-border-strong)', strokeWidth: 1 },
};
/** Bar charts: a soft band instead of the line cursor */
export const CHART_BAR_CURSOR = { fill: 'rgba(255, 255, 255, 0.04)' };
