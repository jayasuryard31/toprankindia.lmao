const steps = [
  {
    number: '01',
    title: 'Add your project',
    body: 'Name, link, one line about what it does. That is the whole submission.',
  },
  {
    number: '02',
    title: 'Place your bid',
    body: 'Pick what the top spot is worth to you. Your bid is your position.',
  },
  {
    number: '03',
    title: 'Climb, or get climbed on',
    body: 'Outbid the projects above you. Hold your rank until someone bids more.',
  },
]

export interface HowItWorksProps {
  /** `section` adds the heading block; `bare` renders only the three steps. */
  variant?: 'section' | 'bare'
}

export function HowItWorks({ variant = 'section' }: HowItWorksProps) {
  const list = (
    <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
      {steps.map((step) => (
        <li key={step.number} className="group bg-surface p-6 transition-colors hover:bg-surface-2">
          <span className="numeric text-[0.8125rem] font-semibold text-brand">{step.number}</span>
          <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">{step.title}</h3>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-muted">{step.body}</p>
        </li>
      ))}
    </ol>
  )

  if (variant === 'bare') return list

  return (
    <section aria-labelledby="how-heading">
      <div className="mb-6">
        <p className="eyebrow">How it works</p>
        <h2
          id="how-heading"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
        >
          Three steps. No strategy.
        </h2>
      </div>
      {list}
    </section>
  )
}
