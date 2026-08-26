import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatMoney, ordinal, toDomain } from '@/lib/format'
import { submitProject } from '@/services/projects'
import { toErrorMessage } from '@/services/http'
import { useAuth } from '@/context/auth-context'
import { useBoard } from '@/context/board-context'
import { useToast } from '@/context/toast-context'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { ProjectPreviewCard } from './ProjectPreviewCard'

const MIN_BID = 5
const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i

interface Fields {
  name: string
  url: string
  tagline: string
  logoUrl: string
  amount: string
}

type FieldErrors = Partial<Record<keyof Fields, string>>

const EMPTY: Fields = { name: '', url: '', tagline: '', logoUrl: '', amount: '' }

function validate(fields: Fields): FieldErrors {
  const errors: FieldErrors = {}

  const name = fields.name.trim()
  if (!name) errors.name = 'Give your project a name.'
  else if (name.length < 2) errors.name = 'That is a bit short.'
  else if (name.length > 32) errors.name = 'Keep it under 32 characters.'

  const domain = toDomain(fields.url)
  if (!domain) errors.url = 'Where can people find it?'
  else if (!DOMAIN_PATTERN.test(domain)) errors.url = 'That doesn’t look like a domain.'

  const tagline = fields.tagline.trim()
  if (!tagline) errors.tagline = 'One line about what it does.'
  else if (tagline.length > 80) errors.tagline = 'Keep it under 80 characters.'

  if (fields.logoUrl && !/^https?:\/\/\S+$/i.test(fields.logoUrl.trim())) {
    errors.logoUrl = 'Use a full image URL, or leave it blank.'
  }

  const amount = Number(fields.amount)
  if (!fields.amount) errors.amount = 'Set an opening bid.'
  else if (!Number.isInteger(amount) || amount < MIN_BID) {
    errors.amount = `Opening bids start at ${formatMoney(MIN_BID)}.`
  }

  return errors
}

/**
 * Project submission. Creates the project and its opening bid in one request —
 * a project with no bid has no place on a leaderboard.
 */
export function ProjectSubmissionForm() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const { invalidate } = useBoard()
  const { toast } = useToast()

  const [fields, setFields] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const set = (key: keyof Fields) => (value: string) => {
    setFields((current) => {
      const next = { ...current, [key]: value }
      if (submitted) setErrors(validate(next))
      return next
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setFormError(null)

    const found = validate(fields)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      const receipt = await submitProject({
        name: fields.name.trim(),
        url: fields.url.trim(),
        tagline: fields.tagline.trim(),
        logoUrl: fields.logoUrl.trim() || null,
        amount: Number(fields.amount),
      })

      await refresh()
      invalidate()

      toast({
        tone: 'success',
        title: `${receipt.project.name} is on the board`,
        description: `Straight in at ${ordinal(receipt.allTimeRank)} all time.`,
      })

      navigate('/my-project')
    } catch (cause) {
      setFormError(toErrorMessage(cause))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <Input
          label="Project name"
          placeholder="Rickshaw"
          autoComplete="off"
          maxLength={32}
          value={fields.name}
          error={errors.name}
          onChange={(event) => set('name')(event.target.value)}
        />

        <Input
          label="Website"
          placeholder="rickshaw.dev"
          prefix="https://"
          inputMode="url"
          autoComplete="url"
          value={fields.url}
          error={errors.url}
          onChange={(event) => set('url')(event.target.value)}
        />

        <Textarea
          label="One-line description"
          placeholder="Preview deploys for monorepos, in seconds"
          maxLength={80}
          counter
          rows={2}
          value={fields.tagline}
          error={errors.tagline}
          onChange={(event) => set('tagline')(event.target.value)}
        />

        <Input
          label="Logo URL"
          placeholder="https://…/logo.png"
          inputMode="url"
          value={fields.logoUrl}
          error={errors.logoUrl}
          hint="Optional. Uploads arrive with accounts — for now, link an image."
          onChange={(event) => set('logoUrl')(event.target.value)}
        />

        <div className="border-t border-line pt-6">
          <Input
            label="Opening bid"
            inputSize="lg"
            prefix="$"
            inputMode="numeric"
            placeholder="50"
            value={fields.amount}
            error={errors.amount}
            hint={`Minimum ${formatMoney(MIN_BID)}. This decides where you enter the board.`}
            onChange={(event) => set('amount')(event.target.value.replace(/[^\d]/g, '').slice(0, 7))}
          />
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-md border border-down/30 bg-down/10 px-3 py-2.5 text-[0.8125rem] text-down"
          >
            {formError}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            loadingLabel="Putting you on the board…"
          >
            Add project & bid
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </div>

        <p className="text-[0.75rem] leading-relaxed text-ink-faint">
          Demo build — no card is charged and your project only exists in this browser tab.
        </p>
      </form>

      <ProjectPreviewCard
        name={fields.name}
        url={fields.url}
        tagline={fields.tagline}
        logoUrl={fields.logoUrl}
        amount={Number(fields.amount) || 0}
      />
    </div>
  )
}
