import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { BidReceipt } from '@/types'
import { cn } from '@/lib/cn'
import { formatMoney, ordinal } from '@/lib/format'
import { getBidContext, placeBid } from '@/services/bids'
import { getLeaderboard } from '@/services/leaderboard'
import { toErrorMessage } from '@/services/http'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useBoard } from '@/context/board-context'
import { useToast } from '@/context/toast-context'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateBlock } from '@/components/ui/StateBlock'

export interface BidModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  /** Amount the user set out to beat, if they came from an "Outbid" button. */
  beat?: number
  chasing?: string
}

const digitsOnly = (value: string) => value.replace(/[^\d]/g, '').slice(0, 7)

/** Lets the sticky footer button submit the form that lives in the body. */
const BID_FORM_ID = 'place-bid-form'

export function BidModal({ open, onClose, projectId, beat, chasing }: BidModalProps) {
  const { invalidate, revision } = useBoard()
  const { toast } = useToast()

  const context = useAsyncData(() => getBidContext(projectId), [projectId, revision])
  const board = useAsyncData(() => getLeaderboard('all-time'), [revision])

  const [draft, setDraft] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<BidReceipt | null>(null)

  const minimum = context.data?.minimumBid ?? 0
  const suggested = Math.max(minimum, beat ? beat + 1 : 0)

  // Until the user types, the field shows a suggested amount derived from the
  // minimum — so "Place bid" is one click away the moment the modal settles.
  const amount = draft ?? (context.data ? String(suggested) : '')
  const value = amount === '' ? null : Number(amount)
  const isEmpty = value === null
  const isTooLow = value !== null && value < minimum

  const project = board.data?.entries.find((entry) => entry.project.id === projectId)?.project

  /** Where this bid would land right now — a projection, not a promise. */
  const projectedRank = useMemo(() => {
    if (!board.data || value === null) return null
    const ahead = board.data.entries.filter(
      (entry) => entry.project.id !== projectId && entry.amount >= value,
    ).length
    return ahead + 1
  }, [board.data, value, projectId])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    if (isEmpty || isTooLow || value === null) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await placeBid({ projectId, amount: value })
      setReceipt(result)
      invalidate()
      toast({
        tone: 'success',
        title: result.tookTopSpot ? 'You took the #1 spot' : 'Bid placed',
        description: `${result.project.name} is now ${ordinal(result.allTimeRank)} all time.`,
      })
    } catch (cause) {
      setSubmitError(toErrorMessage(cause))
    } finally {
      setIsSubmitting(false)
    }
  }

  const inlineError = showErrors && !receipt && isTooLow ? tooLowMessage(minimum) : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={receipt ? 'Bid confirmed' : 'Place your bid'}
      description={
        receipt
          ? undefined
          : chasing
            ? `Beat ${chasing} and take their place.`
            : 'Raise your bid to climb the board.'
      }
      footer={
        receipt ? (
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button fullWidth onClick={onClose}>
              Back to the board
            </Button>
            <Link
              to="/my-project"
              onClick={onClose}
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-line-strong text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              View my project
            </Link>
          </div>
        ) : (
          <div>
            <Button
              type="submit"
              form={BID_FORM_ID}
              size="lg"
              fullWidth
              loading={isSubmitting}
              loadingLabel="Placing your bid…"
              disabled={context.status !== 'success' || isEmpty || isTooLow}
            >
              {isEmpty ? 'Enter an amount' : `Place bid · ${formatMoney(value ?? 0)}`}
            </Button>
            <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-ink-faint">
              Demo — no card is charged and nothing leaves your browser.
            </p>
          </div>
        )
      }
    >
      {receipt ? (
        <BidSuccess receipt={receipt} />
      ) : context.status === 'error' ? (
        <StateBlock
          tone="error"
          glyph="!"
          title="Couldn't load your bid details"
          description={context.error}
          action={
            <Button variant="secondary" onClick={context.refresh}>
              Try again
            </Button>
          }
        />
      ) : context.status === 'loading' ? (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-16 w-full" rounded="lg" />
          <Skeleton className="h-14 w-full" rounded="md" />
          <Skeleton className="h-10 w-full" rounded="md" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {project ? (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 p-3">
              <Avatar
                name={project.name}
                src={project.logoUrl}
                hue={project.hue}
                size="lg"
                shape="square"
              />
              <div className="min-w-0">
                <p className="truncate text-[0.9375rem] font-medium text-ink">{project.name}</p>
                <p className="numeric truncate text-[0.75rem] text-ink-faint">{project.domain}</p>
                <p className="mt-0.5 line-clamp-1 text-[0.75rem] text-ink-muted">
                  {project.tagline}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Figure label="Your current bid" value={formatMoney(context.data!.currentBid)} />
            <Figure
              label="Top bid on the board"
              value={formatMoney(context.data!.topBid)}
              accent
            />
          </div>

          <form id={BID_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              label="Your bid"
              inputSize="lg"
              prefix="$"
              inputMode="numeric"
              autoComplete="off"
              placeholder={String(minimum)}
              value={amount}
              error={inlineError}
              hint={`Minimum ${formatMoney(minimum)} — one dollar above your current bid.`}
              onChange={(event) => {
                setShowErrors(true)
                setDraft(digitsOnly(event.target.value))
              }}
            />

            <div className="flex flex-wrap gap-2">
              {[10, 50, 250].map((step) => (
                <QuickAmount
                  key={step}
                  label={`+$${step}`}
                  onClick={() => {
                    setShowErrors(true)
                    setDraft(String((value ?? minimum) + step))
                  }}
                />
              ))}
              {context.data!.topBid >= minimum && (
                <QuickAmount
                  label={`Take #1 · ${formatMoney(context.data!.topBid + 1)}`}
                  highlight
                  onClick={() => {
                    setShowErrors(true)
                    setDraft(String(context.data!.topBid + 1))
                  }}
                />
              )}
            </div>
          </form>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3">
            <span className="text-[0.8125rem] text-ink-muted">
              {isEmpty || isTooLow ? 'Where this lands' : 'This bid puts you at'}
            </span>
            <span
              className={cn(
                'numeric text-lg font-semibold',
                projectedRank === 1 && !isTooLow && !isEmpty ? 'text-brand' : 'text-ink',
              )}
            >
              {isEmpty || isTooLow || projectedRank === null ? '—' : `#${projectedRank}`}
            </span>
          </div>

          {submitError && (
            <p
              role="alert"
              className="rounded-md border border-down/30 bg-down/10 px-3 py-2 text-[0.8125rem] text-down"
            >
              {submitError}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

function tooLowMessage(minimum: number) {
  return `Too low — your bid has to beat your current one. ${formatMoney(minimum)} or more.`
}

function Figure({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3.5 py-3">
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          'numeric mt-1.5 text-lg font-semibold',
          accent ? 'text-brand' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function QuickAmount({
  label,
  onClick,
  highlight = false,
}: {
  label: string
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'numeric rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-colors',
        highlight
          ? 'border-brand-line bg-brand-soft text-brand hover:bg-brand/20'
          : 'border-line-strong text-ink-muted hover:border-ink-faint hover:text-ink',
      )}
    >
      {label}
    </button>
  )
}

function BidSuccess({ receipt }: { receipt: BidReceipt }) {
  const climbed =
    receipt.previousAllTimeRank !== null && receipt.allTimeRank < receipt.previousAllTimeRank

  return (
    <div className="flex animate-pop flex-col items-center gap-5 py-2 text-center">
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-full bg-brand/20 blur-2xl"
        />
        <p className="eyebrow">All-time rank</p>
        <p className="numeric mt-1 text-6xl leading-none font-semibold text-brand">
          #{receipt.allTimeRank}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-ink">
          {receipt.tookTopSpot
            ? 'You own the top spot'
            : climbed
              ? "You're climbing"
              : "You're in the race"}
        </h3>
        <p className="mt-1.5 text-[0.875rem] text-ink-muted">
          {receipt.project.name} is bidding{' '}
          <span className="numeric font-medium text-ink">{formatMoney(receipt.bid.amount)}</span>
          {receipt.previousAllTimeRank
            ? ` — up from ${ordinal(receipt.previousAllTimeRank)}.`
            : '.'}
        </p>
      </div>

      {receipt.passed.length > 0 && (
        <p className="max-w-xs text-[0.8125rem] text-ink-faint">
          Passed {receipt.passed.slice(0, 3).join(', ')}
          {receipt.passed.length > 3 && ` and ${receipt.passed.length - 3} more`}.
        </p>
      )}

      <p className="rounded-md border border-line bg-surface-2 px-3 py-2 text-[0.75rem] text-ink-faint">
        Hold the spot until someone outbids you. You'll be able to set an alert when the backend
        lands.
      </p>
    </div>
  )
}
