export default function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-soft/80 dark:bg-elevated/80 border border-border/50 dark:border-border/50 ${className}`}
    />
  );
}
