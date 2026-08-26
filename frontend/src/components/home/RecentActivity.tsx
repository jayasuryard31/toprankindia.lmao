import type { ActivityEvent } from '@/types'
import { cn } from '@/lib/cn'
import { formatMoney, formatRelativeTime } from '@/lib/format'
import { getRecentActivity } from '@/services/activity'
import { USE_MOCK_API } from '@/services/config'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useBoard } from '@/context/board-context'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'

const dotTone: Record<ActivityEvent['type'], string> = {
  takeover: 'bg-brand',
  overtake: 'bg-up',
  bid: 'bg-ink-faint',
  joined: 'bg-rank-2',
}

function describe(event: ActivityEvent) {
  switch (event.type) {
    case 'takeover':
      return (
        <>
          took <strong className="font-medium text-brand">#1</strong> with{' '}
          <Amount value={event.amount} />
        </>
      )
    case 'overtake':
      return (
        <>
          climbed to <strong className="font-medium text-ink">#{event.rank}</strong> with{' '}
          <Amount value={event.amount} />
        </>
      )
    case 'joined':
      return (
        <>
          joined the board at <Amount value={event.amount} />
        </>
      )
    case 'bid':
      return (
        <>
          raised to <Amount value={event.amount} />
        </>
      )
  }
}

function Amount({ value }: { value: number }) {
  return <span className="numeric font-medium text-ink">{formatMoney(value)}</span>
}

/** A quiet ticker of what just happened. Deliberately not the main event. */
export function RecentActivity() {
  const { revision } = useBoard()
  const { data, status, error } = useAsyncData(() => getRecentActivity(7), [revision])

  return (
    <section aria-labelledby="activity-heading" className="rounded-lg border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="activity-heading" className="text-[0.9375rem] font-semibold text-ink">
          Recent activity
        </h2>
        {USE_MOCK_API && (
          <span className="eyebrow" title="This feed replays the demo dataset.">
            Demo feed
          </span>
        )}
      </header>

      {status === 'loading' && (
        <ul className="divide-y divide-line">
          {[0, 1, 2, 3].map((index) => (
            <li key={index} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-7" rounded="full" />
              <Skeleton className="h-3.5 flex-1" rounded="sm" />
              <Skeleton className="h-3 w-12" rounded="sm" />
            </li>
          ))}
        </ul>
      )}

      {status === 'error' && (
        <p className="px-4 py-6 text-center text-[0.8125rem] text-ink-faint">{error}</p>
      )}

      {status === 'success' && data?.length === 0 && (
        <p className="px-4 py-6 text-center text-[0.8125rem] text-ink-faint">
          Nothing has happened yet. Be the first to bid.
        </p>
      )}

      {data && data.length > 0 && (
        <ul className="divide-y divide-line">
          {data.map((event, index) => (
            <li
              key={event.id}
              style={{ animationDelay: `${index * 40}ms` }}
              className="flex animate-fade items-center gap-3 px-4 py-3"
            >
              <span className="relative flex shrink-0 items-center">
                <Avatar
                  name={event.project.name}
                  src={event.project.logoUrl}
                  hue={event.project.hue}
                  size="sm"
                  shape="square"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-surface',
                    dotTone[event.type],
                  )}
                />
              </span>

              <p className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink-muted">
                <span className="font-medium text-ink">{event.project.name}</span> {describe(event)}
              </p>

              <time
                dateTime={event.createdAt}
                className="numeric shrink-0 text-[0.6875rem] text-ink-faint"
              >
                {formatRelativeTime(event.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
