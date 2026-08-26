import { cn } from '@/lib/cn'
import { CaretDown, CaretUp } from '@/components/ui/icons'

export interface RankDeltaProps {
  rank: number
  previousRank: number | null
  className?: string
}

/** Movement since the last shake-up: ▲2, ▼1, NEW, or a quiet dash. */
export function RankDelta({ rank, previousRank, className }: RankDeltaProps) {
  if (previousRank === null) {
    return (
      <span
        className={cn(
          'numeric text-[0.625rem] font-medium tracking-wide text-brand uppercase',
          className,
        )}
      >
        New
      </span>
    )
  }

  const change = previousRank - rank

  if (change === 0) {
    return (
      <span className={cn('text-[0.6875rem] text-ink-faint', className)} aria-label="No change">
        —
      </span>
    )
  }

  const up = change > 0

  return (
    <span
      className={cn(
        'numeric inline-flex items-center gap-0.5 text-[0.6875rem] font-medium',
        up ? 'text-up' : 'text-down',
        className,
      )}
      aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(change)} ${
        Math.abs(change) === 1 ? 'place' : 'places'
      }`}
    >
      {up ? <CaretUp className="size-2.5" /> : <CaretDown className="size-2.5" />}
      {Math.abs(change)}
    </span>
  )
}
