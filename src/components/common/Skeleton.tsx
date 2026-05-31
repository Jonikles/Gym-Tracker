import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

/** Shimmer loading placeholder */
export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--radius-md)',
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}

/** Pre-built skeleton for a card-like row */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className={styles.card}>
      <Skeleton width="60%" height="1rem" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} width={i % 2 === 0 ? '80%' : '40%'} height="0.75rem" />
      ))}
    </div>
  );
}

/** Multiple skeleton cards for a list */
export function SkeletonList({ count = 4, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}
