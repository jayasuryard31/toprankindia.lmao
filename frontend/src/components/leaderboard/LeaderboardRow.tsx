import type { LeaderboardEntry } from '@/types'
import { cn } from '@/lib/cn'
import { formatDate, formatRelativeTime } from '@/lib/format'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ArrowUpRight } from '@/components/ui/icons'
import { BidAmount } from './BidAmount'
import { RankDelta } from './RankDelta'

export interface LeaderboardRowProps {
  entry: LeaderboardEntry
  index: number
  showRelativeTime: boolean
  isMine: boolean
  onOutbid: (entry: LeaderboardEntry) => void
}

/**
 * One row from rank 4 down.
 *
 * A single grid handles both layouts — 3 columns × 2 rows on phones, one dense
 * line from `md` up — so there is no duplicated markup to keep in sync.
 */
export function LeaderboardRow({
  entry,
  index,
  showRelativeTime,
  isMine,
  onOutbid,
}: LeaderboardRowProps) {
  const { project, bidder } = entry
  const time = showRelativeTime
    ? formatRelativeTime(entry.lastBidAt)
    : formatDate(entry.lastBidAt)

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
      className={cn(
        'group animate-rise grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5',
        'border-t border-line px-3 py-3.5 transition-colors duration-150 hover:bg-surface-2',
        'md:grid-cols-[3.25rem_minmax(0,1fr)_8.5rem_6.5rem_7.5rem_5.5rem] md:gap-y-0 md:px-4 md:py-3',
        isMine && 'bg-brand-soft/40 hover:bg-brand-soft/60',
      )}
    >
      {/* Rank */}
      <div className="col-start-1 row-start-1 flex flex-col items-center gap-0.5 md:flex-row md:gap-2">
        <span className="numeric text-sm font-semibold text-ink-muted md:text-[0.9375rem]">
          {entry.rank}
        </span>
        <RankDelta rank={entry.rank} previousRank={entry.previousRank} />
      </div>

      {/* Project */}
      <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-3">
        <Avatar
          name={project.name}
          src={project.logoUrl}
          hue={project.hue}
          size="md"
          shape="square"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-[0.9375rem] leading-tight font-medium text-ink">
            {project.name}
            {isMine && (
              <span className="eyebrow shrink-0 text-brand" aria-label="Your project">
                You
              </span>
            )}
          </p>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="numeric inline-flex items-center gap-1 text-[0.75rem] text-ink-faint transition-colors hover:text-brand"
          >
            {project.domain}
            <ArrowUpRight className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        </div>
      </div>

      {/* Bidder (+ time on phones) */}
      <div className="col-start-2 row-start-2 flex min-w-0 items-center gap-2 md:col-start-3 md:row-start-1">
        <Avatar name={bidder.name} src={bidder.avatarUrl} hue={bidder.hue} size="xs" />
        <span className="truncate text-[0.8125rem] text-ink-muted">@{bidder.handle}</span>
        <span className="numeric shrink-0 text-[0.75rem] text-ink-faint md:hidden">· {time}</span>
      </div>

      {/* Time (desktop column) */}
      <p className="numeric col-start-4 hidden text-[0.75rem] text-ink-faint md:block">{time}</p>

      {/* Amount */}
      <div className="col-start-3 row-start-1 text-right md:col-start-5">
        <BidAmount amount={entry.amount} size="sm" className="text-ink" />
        <p className="numeric mt-0.5 text-[0.6875rem] text-ink-faint">
          {entry.bidCount} {entry.bidCount === 1 ? 'bid' : 'bids'}
        </p>
      </div>

      {/* Action */}
      <div className="col-start-3 row-start-2 flex justify-end md:col-start-6 md:row-start-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onOutbid(entry)}
          className="text-ink-faint group-hover:text-brand"
        >
          Outbid
        </Button>
      </div>
    </li>
  )
}
