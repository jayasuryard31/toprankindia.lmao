import { Link } from 'react-router-dom'
import type { LeaderboardEntry } from '@/types'
import { formatCompactMoney, formatMoney, formatRelativeTime } from '@/lib/format'
import { getTopSpot } from '@/services/leaderboard'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useBidFlow } from '@/context/bid-flow-context'
import { useBoard } from '@/context/board-context'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { Skeleton } from '@/components/ui/Skeleton'
import { ArrowUpRight } from '@/components/ui/icons'
import { BidAmount } from '@/components/leaderboard/BidAmount'

/**
 * The pitch, and a live look at the thing being fought over. The leader panel
 * doubles as the fastest path into the product: outbid them from here.
 */
export function Hero() {
  const { openBid } = useBidFlow()
  const { revision } = useBoard()
  const { data, status } = useAsyncData(() => getTopSpot(), [revision])

  const leader = data?.entry ?? null
  const priceOfFirst = leader ? leader.amount + 1 : 5

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden="true"
        className="grid-backdrop pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 size-[540px] -translate-x-1/2 rounded-full bg-brand/8 blur-[120px]"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-20 lg:pb-24">
        <div className="flex animate-rise flex-col items-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5">
            <span aria-hidden="true" className="size-1.5 animate-pulse-dot rounded-full bg-brand" />
            <span className="eyebrow text-ink-muted">
              {data ? `${data.contenders} projects competing` : 'Live leaderboard'}
            </span>
          </span>

          <h1 className="mt-6 text-display text-ink">
            The leaderboard
            <br />
            is for sale.
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-muted">
            Put your project on the board and bid what the top spot is worth to you. Highest bid
            sits at&nbsp;#1 — until someone wants it more.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button size="lg" onClick={() => openBid()} className="sm:w-auto">
              Place a bid
            </Button>
            <Link to="/how-it-works" className={buttonStyles({ variant: 'outline', size: 'lg' })}>
              See how it works
            </Link>
          </div>

          <dl className="mt-10 grid w-full grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 sm:grid-cols-3">
            <HeroStat
              label="Cost of #1 right now"
              value={status === 'loading' ? null : formatMoney(priceOfFirst)}
              accent
            />
            <HeroStat
              label="Bid all time"
              value={data ? formatCompactMoney(data.volume) : null}
            />
            <HeroStat
              label="Entry bid"
              value="$5"
              hint="Anyone can join"
              className="hidden sm:block"
            />
          </dl>
        </div>

        <div className="relative animate-rise [animation-delay:120ms]">
          <TopSpotPanel
            leader={leader}
            loading={status === 'loading'}
            failed={status === 'error'}
            onOutbid={() =>
              openBid(
                leader
                  ? { beat: leader.amount, chasing: leader.project.name }
                  : undefined,
              )
            }
          />
        </div>
      </div>
    </section>
  )
}

function HeroStat({
  label,
  value,
  hint,
  accent = false,
  className,
}: {
  label: string
  value: string | null
  hint?: string
  accent?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5">
        {value === null ? (
          <Skeleton className="h-6 w-20" rounded="sm" />
        ) : (
          <span
            className={`numeric text-xl font-semibold ${accent ? 'text-brand' : 'text-ink'}`}
          >
            {value}
          </span>
        )}
        {hint && <span className="ml-2 text-[0.75rem] text-ink-faint">{hint}</span>}
      </dd>
    </div>
  )
}

function TopSpotPanel({
  leader,
  loading,
  failed,
  onOutbid,
}: {
  leader: LeaderboardEntry | null
  loading: boolean
  failed: boolean
  onOutbid: () => void
}) {
  return (
    <div className="relative rounded-xl border border-brand-line/60 bg-surface p-1.5 shadow-pop">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="eyebrow text-brand">Currently #1</span>
        <span className="eyebrow">
          {loading ? '···' : leader ? formatRelativeTime(leader.lastBidAt) : 'open'}
        </span>
      </div>

      <div className="rounded-lg border border-line bg-canvas p-5">
        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-14" rounded="lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" rounded="sm" />
                <Skeleton className="h-3 w-24" rounded="sm" />
              </div>
            </div>
            <Skeleton className="h-12 w-48" rounded="sm" />
            <Skeleton className="h-10 w-full" rounded="md" />
          </div>
        ) : failed ? (
          <div className="py-6 text-center">
            <p className="text-[0.9375rem] font-medium text-ink">Board unavailable</p>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              We couldn't reach the leaderboard just now.
            </p>
          </div>
        ) : !leader ? (
          <div className="py-6 text-center">
            <p className="numeric text-3xl font-semibold text-brand">#1</p>
            <p className="mt-2 text-[0.9375rem] font-medium text-ink">Nobody is here yet</p>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              The top spot is unclaimed. $5 takes it.
            </p>
            <Button className="mt-4" onClick={onOutbid}>
              Claim #1
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3.5">
              <Avatar
                name={leader.project.name}
                src={leader.project.logoUrl}
                hue={leader.project.hue}
                size="xl"
                shape="square"
              />
              <div className="min-w-0">
                <p className="truncate text-xl font-semibold tracking-tight text-ink">
                  {leader.project.name}
                </p>
                <a
                  href={leader.project.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="numeric inline-flex items-center gap-1 text-[0.8125rem] text-ink-faint transition-colors hover:text-brand"
                >
                  {leader.project.domain}
                  <ArrowUpRight className="size-3" />
                </a>
              </div>
            </div>

            <p className="mt-3 line-clamp-2 text-[0.875rem] leading-snug text-ink-muted">
              {leader.project.tagline}
            </p>

            <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-5">
              <div>
                <p className="eyebrow mb-1.5">Holding with</p>
                <BidAmount amount={leader.amount} size="xl" animate className="text-brand" />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Avatar
                  name={leader.bidder.name}
                  src={leader.bidder.avatarUrl}
                  hue={leader.bidder.hue}
                  size="sm"
                />
                <span className="text-[0.8125rem] text-ink-muted">@{leader.bidder.handle}</span>
              </div>
            </div>

            <Button fullWidth size="lg" className="mt-5" onClick={onOutbid}>
              Take #1 for {formatMoney(leader.amount + 1)}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
