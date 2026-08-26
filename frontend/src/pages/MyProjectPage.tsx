import { Link } from 'react-router-dom'
import type { ProjectStanding } from '@/types'
import { cn } from '@/lib/cn'
import { formatDateTime, formatMoney, formatRelativeTime } from '@/lib/format'
import { getMyProject } from '@/services/projects'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useAuth } from '@/context/auth-context'
import { useBidFlow } from '@/context/bid-flow-context'
import { useBoard } from '@/context/board-context'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateBlock } from '@/components/ui/StateBlock'
import { ArrowUpRight } from '@/components/ui/icons'
import { BidAmount } from '@/components/leaderboard/BidAmount'

export function MyProjectPage() {
  usePageMeta('My project', 'Your rank, your bid history, and what it costs to take #1.')

  const { status: authStatus, session, openAuth } = useAuth()
  const { revision } = useBoard()
  const projectId = session?.projectId ?? null

  const { data, status, error, refresh } = useAsyncData(
    () => (projectId ? getMyProject() : Promise.resolve(null)),
    [projectId, revision],
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
      <header className="mb-10">
        <p className="eyebrow">My project</p>
        <h1 className="mt-3 text-title text-ink">Your position</h1>
      </header>

      {authStatus === 'loading' && <StandingSkeleton />}

      {authStatus === 'anonymous' && (
        <StateBlock
          glyph="◎"
          title="Sign in to see your project"
          description="Your rank, bid history and what it would cost to take #1 live here."
          action={
            <Button size="lg" onClick={() => openAuth('sign-in')}>
              Sign in
            </Button>
          }
        />
      )}

      {authStatus === 'authenticated' && !projectId && (
        <StateBlock
          glyph="+"
          title="You haven't added a project yet"
          description="Put one on the board with an opening bid and this page fills up."
          action={
            <Link to="/submit" className={buttonStyles({ size: 'lg' })}>
              Add your project
            </Link>
          }
        />
      )}

      {authStatus === 'authenticated' && projectId && (
        <>
          {status === 'loading' && !data && <StandingSkeleton />}

          {status === 'error' && (
            <StateBlock
              tone="error"
              glyph="!"
              title="Couldn't load your project"
              description={error}
              action={
                <Button variant="secondary" onClick={refresh}>
                  Try again
                </Button>
              }
            />
          )}

          {status === 'success' && !data && (
            <StateBlock
              glyph="?"
              title="Project not found"
              description="It may have been removed from the board. Add it again to get back in the race."
              action={
                <Link to="/submit" className={buttonStyles({ size: 'lg' })}>
                  Add a project
                </Link>
              }
            />
          )}

          {data && <Standing standing={data} />}
        </>
      )}
    </div>
  )
}

function Standing({ standing }: { standing: ProjectStanding }) {
  const { openBid } = useBidFlow()
  const { project } = standing
  const isLeader = standing.allTimeRank === 1
  const lastBid = standing.bids[0]

  return (
    <div className="flex animate-rise flex-col gap-4">
      <section className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <Avatar
            name={project.name}
            src={project.logoUrl}
            hue={project.hue}
            size="xl"
            shape="square"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{project.name}</h2>
              {isLeader && <Badge tone="brand">#1 all time</Badge>}
            </div>

            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="numeric mt-1 inline-flex items-center gap-1 text-[0.875rem] text-ink-faint transition-colors hover:text-brand"
            >
              {project.domain}
              <ArrowUpRight className="size-3" />
            </a>

            <p className="mt-2 max-w-md text-[0.875rem] leading-snug text-ink-muted">
              {project.tagline}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="eyebrow mb-1.5">Current bid</p>
            <BidAmount
              amount={standing.currentBid}
              size="lg"
              animate
              className={isLeader ? 'text-brand' : 'text-ink'}
            />
          </div>
        </div>

        <div
          className={cn(
            'flex flex-col gap-4 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6',
            isLeader ? 'border-brand-line bg-brand-soft' : 'border-line bg-surface-2',
          )}
        >
          <p className="text-[0.9375rem] text-ink">
            {isLeader ? (
              <>
                You're holding the top spot.{' '}
                <span className="text-ink-muted">Raise your bid to make it expensive.</span>
              </>
            ) : (
              <>
                <span className="text-ink-muted">Take #1 for</span>{' '}
                <span className="numeric font-semibold text-brand">
                  {formatMoney(standing.amountToTakeTop)}
                </span>
              </>
            )}
          </p>

          <Button onClick={() => openBid()}>
            {isLeader ? 'Raise your bid' : 'Outbid the leader'}
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="All-time rank"
          value={standing.allTimeRank ? `#${standing.allTimeRank}` : '—'}
          accent={isLeader}
        />
        <Metric
          label="Today's rank"
          value={standing.dailyRank ? `#${standing.dailyRank}` : 'Not today'}
          hint={standing.dailyRank ? undefined : 'No bid in 24h'}
        />
        <Metric label="Highest bid" value={formatMoney(standing.highestBid)} />
        <Metric
          label="Bids placed"
          value={String(standing.bidCount)}
          hint={lastBid ? `last ${formatRelativeTime(lastBid.createdAt)}` : undefined}
        />
      </div>

      <section
        aria-labelledby="history-heading"
        className="overflow-hidden rounded-lg border border-line bg-surface"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 id="history-heading" className="text-[0.9375rem] font-semibold text-ink">
            Bid history
          </h3>
          <span className="eyebrow">{standing.bids.length} bids</span>
        </header>

        {standing.bids.length === 0 ? (
          <p className="px-5 py-8 text-center text-[0.875rem] text-ink-faint">No bids yet.</p>
        ) : (
          <ol className="divide-y divide-line">
            {standing.bids.map((bid, index) => {
              const previous = standing.bids[index + 1]
              const delta = previous ? bid.amount - previous.amount : null

              return (
                <li
                  key={bid.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="numeric text-[0.875rem] font-medium text-ink">
                      {formatMoney(bid.amount)}
                      {delta !== null && (
                        <span className="numeric ml-2 text-[0.75rem] font-normal text-up">
                          +{formatMoney(delta)}
                        </span>
                      )}
                      {index === 0 && (
                        <span className="eyebrow ml-2 text-brand">Current</span>
                      )}
                    </p>
                    <p className="numeric mt-0.5 text-[0.75rem] text-ink-faint">
                      {formatDateTime(bid.createdAt)}
                    </p>
                  </div>

                  <span className="numeric text-[0.75rem] text-ink-faint">
                    {formatRelativeTime(bid.createdAt)}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          'numeric mt-2 text-xl font-semibold',
          accent ? 'text-brand' : 'text-ink',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[0.6875rem] text-ink-faint">{hint}</p>}
    </div>
  )
}

function StandingSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-44 w-full" rounded="lg" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24 w-full" rounded="lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" rounded="lg" />
    </div>
  )
}
