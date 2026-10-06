/** Format a kebab-case muscle group key for display: "upper-chest" → "Upper Chest" */
export function formatMuscleGroup(mg: string): string {
  return mg
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Capitalize the first letter: "barbell" → "Barbell" */
export function formatLabel(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Compact number for big volume totals: 950 → "950", 137_040 → "137k", 1_250_000 → "1.3M" */
export function formatCompactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trimZero((n / 1_000_000).toFixed(1))}M`;
  if (abs >= 100_000) return `${Math.round(n / 1000)}k`;
  if (abs >= 1000) return `${trimZero((n / 1000).toFixed(1))}k`;
  return `${Math.round(n)}`;
}

function trimZero(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
