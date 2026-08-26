import { Link } from 'react-router-dom'
import { usePageMeta } from '@/hooks/usePageMeta'
import { USE_MOCK_API } from '@/services/config'
import { useBidFlow } from '@/context/bid-flow-context'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { HowItWorks } from '@/components/home/HowItWorks'

const rules = [
  'The highest bid on a project is its position. Nothing else moves you up.',
  'Ties go to whoever reached the amount first.',
  'Bids only go up. You can raise yours any time; you can’t lower it.',
  'One project per account.',
  'All time counts every bid ever placed. Today counts the last 24 hours.',
]

const faqs = [
  {
    q: 'Is any money actually charged?',
    a: 'Not in this build. There is no payment processing and no server — every project, bidder and amount you see is demo data generated in your browser.',
  },
  {
    q: 'What happens when someone outbids me?',
    a: 'You drop to the position their bid pushed you out of. Raise your bid above theirs to take it back.',
  },
  {
    q: 'Why are there two boards?',
    a: 'All time rewards sustained spending; Today resets the race every 24 hours so a well-timed bid can lead the board without outspending everyone.',
  },
  {
    q: 'Can I edit or remove my project?',
    a: 'Not yet. Project editing arrives with the account system.',
  },
]

export function HowItWorksPage() {
  usePageMeta(
    'How it works',
    'Add your project, place a bid, climb the leaderboard. The highest bid holds the top spot.',
  )

  const { openBid } = useBidFlow()

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <header className="animate-rise">
        <p className="eyebrow">How it works</p>
        <h1 className="mt-3 text-title text-ink">
          Money is the only ranking signal.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-muted">
          No upvotes, no algorithm, no editorial picks. Your position is exactly what you're
          willing to bid for it — and anyone can take it from you by bidding more.
        </p>
      </header>

      <div className="mt-12">
        <HowItWorks variant="bare" />
      </div>

      <section aria-labelledby="rules-heading" className="mt-16">
        <h2 id="rules-heading" className="text-xl font-semibold tracking-tight text-ink">
          The rules
        </h2>
        <ul className="mt-5 flex flex-col divide-y divide-line border-y border-line">
          {rules.map((rule, index) => (
            <li key={rule} className="flex items-baseline gap-4 py-3.5">
              <span className="numeric shrink-0 text-[0.75rem] text-ink-faint">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-[0.9375rem] leading-relaxed text-ink-muted">{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq-heading" className="mt-16">
        <h2 id="faq-heading" className="text-xl font-semibold tracking-tight text-ink">
          Questions
        </h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-lg border border-line bg-surface p-5">
              <dt className="text-[0.9375rem] font-medium text-ink">{faq.q}</dt>
              <dd className="mt-2 text-[0.875rem] leading-relaxed text-ink-muted">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {USE_MOCK_API && (
        <p className="mt-10 rounded-lg border border-line bg-surface-2 px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-faint">
          <span className="font-medium text-ink-muted">About this demo:</span> the leaderboard runs
          entirely in your browser against a fictional dataset. Bids you place are real inside this
          tab and disappear when you refresh.
        </p>
      )}

      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={() => openBid()}>
          Place a bid
        </Button>
        <Link to="/" className={buttonStyles({ variant: 'outline', size: 'lg' })}>
          Back to the board
        </Link>
      </div>
    </div>
  )
}
