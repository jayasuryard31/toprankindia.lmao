import { useState } from 'react'
import type { LeaderboardEntry, LeaderboardPeriod } from '@/types'
import { formatCompactMoney, formatRelativeTime } from '@/lib/format'
import { getLeaderboard, LEADERBOARD_PERIODS } from '@/services/leaderboard'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useAuth } from '@/context/auth-context'
import { useBidFlow } from '@/context/bid-flow-context'
import { useBoard } from '@/context/board-context'
import { Button } from '@/components/ui/Button'
import { StateBlock } from '@/components/ui/StateBlock'
import { Tabs } from '@/components/ui/Tabs'
import { LeaderboardPodium } from './LeaderboardPodium'
import { LeaderboardRow } from './LeaderboardRow'
import { LeaderboardSkeleton } from './LeaderboardSkeleton'

const PANEL_ID = 'leaderboard-panel'

const volumeLabel: Record<LeaderboardPeriod, string> = {
  'all-time': 'bid all time',
  today: 'bid today',
  week: 'bid this week',
}

export function Leaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time')
  const { revision } = useBoard()
  const { session } = useAuth()
  const { openBid } = useBidFlow()

  const { data, status, error, isRefreshing, refresh } = useAsyncData(
    () => getLeaderboard(period),
    [period, revision],
  )

  const handleOutbid = (entry: LeaderboardEntry) =>
    openBid({ beat: entry.amount, chasing: entry.project.name })

  const showRelativeTime = period !== 'all-time'
  const podium = data?.entries.slice(0, 3) ?? []
  const rest = data?.entries.slice(3) ?? []

  return (
    <section id="leaderboard" aria-labelledby="leaderboard-heading" className="scroll-mt-24">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">The board</p>
          <h2
            id="leaderboard-heading"
            className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
          >
            Leaderboard
          </h2>
          <p className="mt-2 max-w-md text-[0.9375rem] text-ink-muted">
            Highest bid holds the spot. Ties go to whoever got there first.
          </p>
        </div>

        <Tabs
          items={LEADERBOARD_PERIODS.map(({ id, label }) => ({ id, label }))}
          value={period}
          onChange={setPeriod}
          panelId={PANEL_ID}
          label="Leaderboard period"
        />
      </header>

      <div
        className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3"
        aria-live="polite"
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`size-1.5 rounded-full ${
              isRefreshing ? 'animate-pulse-dot bg-warn' : 'animate-pulse-dot bg-brand'
            }`}
          />
          <span className="eyebrow text-ink-muted">
            {isRefreshing ? 'Updating' : 'Live board'}
          </span>
        </span>

        {data && (
          <>
            <Stat value={`${data.entries.length}`} label="projects ranked" />
            <Stat value={formatCompactMoney(data.volume)} label={volumeLabel[period]} />
            <Stat value={formatRelativeTime(data.updatedAt)} label="last updated" hideOnMobile />
          </>
        )}
      </div>

      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={`tab-${period}`}
        tabIndex={-1}
        className="mt-5 outline-none"
      >
        {status === 'loading' && !data && <LeaderboardSkeleton />}

        {status === 'error' && !data && (
          <StateBlock
            tone="error"
            glyph="!"
            title="The board didn't load"
            description={error}
            action={
              <Button variant="secondary" onClick={refresh}>
                Try again
              </Button>
            }
          />
        )}

        {data && data.entries.length === 0 && (
          <StateBlock
            glyph="#1"
            title="Nobody has bid yet"
            description="The top spot is wide open. Put your project up and it's yours by default."
            action={<Button onClick={() => openBid()}>Claim #1</Button>}
          />
        )}

        {data && data.entries.length > 0 && (
          <>
            <LeaderboardPodium
              entries={podium}
              showRelativeTime={showRelativeTime}
              currentProjectId={session?.projectId}
              onOutbid={handleOutbid}
            />

            {rest.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
                <div className="hidden grid-cols-[3.25rem_minmax(0,1fr)_8.5rem_6.5rem_7.5rem_5.5rem] items-center gap-x-3 px-4 py-2.5 md:grid">
                  <span className="eyebrow">Rank</span>
                  <span className="eyebrow">Project</span>
                  <span className="eyebrow">Bidder</span>
                  <span className="eyebrow">Last bid</span>
                  <span className="eyebrow text-right">Amount</span>
                  <span className="sr-only">Actions</span>
                </div>

                <ol>
                  {rest.map((entry, index) => (
                    <LeaderboardRow
                      key={entry.project.id}
                      entry={entry}
                      index={index}
                      showRelativeTime={showRelativeTime}
                      isMine={entry.project.id === session?.projectId}
                      onOutbid={handleOutbid}
                    />
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function Stat({
  value,
  label,
  hideOnMobile = false,
}: {
  value: string
  label: string
  hideOnMobile?: boolean
}) {
  return (
    <span className={`flex items-baseline gap-1.5 ${hideOnMobile ? 'hidden sm:flex' : ''}`}>
      <span className="numeric text-[0.9375rem] font-medium text-ink">{value}</span>
      <span className="text-[0.8125rem] text-ink-faint">{label}</span>
    </span>
  )
}
