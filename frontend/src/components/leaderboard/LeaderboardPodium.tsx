import type { LeaderboardEntry } from '@/types'
import { cn } from '@/lib/cn'
import { formatDate, formatRelativeTime } from '@/lib/format'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ArrowUpRight } from '@/components/ui/icons'
import { BidAmount } from './BidAmount'
import { RankDelta } from './RankDelta'
import { rankStyle } from './rank-style'

interface PodiumProps {
  entries: LeaderboardEntry[]
  /** Relative time on the daily board, absolute date on all-time. */
  showRelativeTime: boolean
  currentProjectId?: string | null
  onOutbid: (entry: LeaderboardEntry) => void
}

/**
 * The top three. DOM order is 1–2–3 (so screen readers and mobile read the
 * ranking correctly); on desktop CSS reorders them into a 2–1–3 podium with the
 * leader raised.
 */
export function LeaderboardPodium({
  entries,
  showRelativeTime,
  currentProjectId,
  onOutbid,
}: PodiumProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3 md:items-end md:gap-4">
      {entries.map((entry, index) => (
        <PodiumCard
          key={entry.project.id}
          entry={entry}
          index={index}
          showRelativeTime={showRelativeTime}
          isMine={entry.project.id === currentProjectId}
          onOutbid={onOutbid}
        />
      ))}
    </div>
  )
}

const placement: Record<number, string> = {
  1: 'md:order-2 md:pb-8',
  2: 'md:order-1',
  3: 'md:order-3',
}

function PodiumCard({
  entry,
  index,
  showRelativeTime,
  isMine,
  onOutbid,
}: {
  entry: LeaderboardEntry
  index: number
  showRelativeTime: boolean
  isMine: boolean
  onOutbid: (entry: LeaderboardEntry) => void
}) {
  const { rank, project, bidder } = entry
  const style = rankStyle(rank)
  const isLeader = rank === 1

  return (
    <article
      style={{ animationDelay: `${index * 70}ms` }}
      className={cn(
        'group relative flex animate-rise flex-col gap-5 overflow-hidden rounded-lg border bg-surface p-5',
        'transition-[border-color,transform] duration-300 hover:-translate-y-0.5',
        style.border,
        isLeader ? 'md:p-6' : 'md:p-5',
        placement[rank] ?? '',
      )}
    >
      {isLeader && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-56 rounded-full bg-brand/12 blur-3xl"
        />
      )}

      <header className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'numeric grid h-7 min-w-9 place-items-center rounded-sm border px-1.5 text-sm font-semibold',
              style.text,
              style.border,
              style.chip,
            )}
          >
            #{rank}
          </span>
          <span className="eyebrow">{style.label}</span>
        </div>

        <div className="flex items-center gap-2">
          {isMine && <Badge tone="brand">You</Badge>}
          <RankDelta rank={rank} previousRank={entry.previousRank} />
        </div>
      </header>

      <div className="relative flex items-start gap-3.5">
        <Avatar
          name={project.name}
          src={project.logoUrl}
          hue={project.hue}
          size={isLeader ? 'xl' : 'lg'}
          shape="square"
        />

        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'truncate font-semibold tracking-tight text-ink',
              isLeader ? 'text-xl sm:text-2xl' : 'text-lg',
            )}
          >
            {project.name}
          </h3>

          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="numeric inline-flex items-center gap-1 text-[0.8125rem] text-ink-faint transition-colors hover:text-brand"
          >
            {project.domain}
            <ArrowUpRight className="size-3" />
          </a>

          <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-snug text-ink-muted">
            {project.tagline}
          </p>
        </div>
      </div>

      <div className="relative mt-auto">
        <p className="eyebrow mb-1.5">Current bid</p>
        <BidAmount
          amount={entry.amount}
          size={isLeader ? 'xl' : 'lg'}
          animate
          className={isLeader ? 'text-brand' : 'text-ink'}
        />
      </div>

      <footer className="relative flex items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={bidder.name} src={bidder.avatarUrl} hue={bidder.hue} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] leading-tight text-ink-muted">
              @{bidder.handle}
            </p>
            <p className="numeric text-[0.6875rem] leading-tight text-ink-faint">
              {showRelativeTime
                ? formatRelativeTime(entry.lastBidAt)
                : formatDate(entry.lastBidAt)}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant={isLeader ? 'primary' : 'outline'}
          onClick={() => onOutbid(entry)}
        >
          Outbid
        </Button>
      </footer>
    </article>
  )
}
