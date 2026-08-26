import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

/** Wordmark. The mark is a rising bar chart — climbing, not decorating. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-sm outline-offset-4',
        className,
      )}
      aria-label="TopRank — home"
    >
      <span className="flex h-6 items-end gap-[3px]" aria-hidden="true">
        <span className="h-2.5 w-[3px] rounded-xs bg-ink-faint transition-all duration-300 group-hover:h-3.5" />
        <span className="h-4 w-[3px] rounded-xs bg-ink-muted transition-all duration-300 group-hover:h-5" />
        <span className="h-6 w-[3px] rounded-xs bg-brand transition-all duration-300" />
      </span>
      <span className="text-[0.9375rem] font-semibold tracking-[-0.02em] text-ink">
        TopRank
      </span>
    </Link>
  )
}
