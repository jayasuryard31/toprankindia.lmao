import { Link } from 'react-router-dom'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useAuth } from '@/context/auth-context'
import { useBidFlow } from '@/context/bid-flow-context'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { Hero } from '@/components/home/Hero'
import { HowItWorks } from '@/components/home/HowItWorks'
import { RecentActivity } from '@/components/home/RecentActivity'
import { Leaderboard } from '@/components/leaderboard/Leaderboard'

export function LeaderboardPage() {
  usePageMeta(
    'Leaderboard',
    'Bid on your project and climb the leaderboard. Highest bid holds #1 — until someone wants it more.',
  )

  const { openBid } = useBidFlow()
  const { session } = useAuth()

  return (
    <>
      <Hero />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <Leaderboard />

        <div className="mt-16 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>

          <aside className="flex flex-col justify-between gap-6 rounded-lg border border-line bg-surface p-6">
            <div>
              <p className="eyebrow">Not on the board?</p>
              <p className="mt-3 text-xl leading-snug font-semibold tracking-tight text-ink">
                $5 puts your project in front of everyone looking at this page.
              </p>
              <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-muted">
                Add your project, set an opening bid, and start climbing. Raise it whenever you
                want the spot back.
              </p>
            </div>

            {session?.projectId ? (
              <div className="flex flex-col gap-2">
                <Button fullWidth onClick={() => openBid()}>
                  Raise your bid
                </Button>
                <Link
                  to="/my-project"
                  className={buttonStyles({ variant: 'ghost', size: 'md', fullWidth: true })}
                >
                  View my project
                </Link>
              </div>
            ) : (
              <Link
                to="/submit"
                className={buttonStyles({ size: 'lg', fullWidth: true })}
              >
                Add your project
              </Link>
            )}
          </aside>
        </div>

        <div className="mt-16">
          <HowItWorks />
        </div>

        <section className="mt-16 overflow-hidden rounded-xl border border-line bg-surface">
          <div className="relative px-6 py-14 text-center">
            <div
              aria-hidden="true"
              className="grid-backdrop pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(60%_80%_at_50%_50%,black,transparent)]"
            />
            <div className="relative">
              <h2 className="text-title text-ink">Everyone below you is trying to move up.</h2>
              <p className="mx-auto mt-4 max-w-md text-[0.9375rem] text-ink-muted">
                Ranks only change when someone pays for it. Decide what the top spot is worth to
                you.
              </p>
              <Button size="lg" className="mt-7" onClick={() => openBid()}>
                Place your bid
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
