import { useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string | null
  /** Shown as `used/maxLength` in the corner. */
  counter?: boolean
}

export function Textarea({
  label,
  hint,
  error,
  counter = false,
  className,
  id,
  maxLength,
  value,
  ...props
}: TextareaProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const hintId = `${textareaId}-hint`
  const errorId = `${textareaId}-error`
  const used = typeof value === 'string' ? value.length : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={textareaId} className="text-[0.8125rem] font-medium text-ink-muted">
          {label}
        </label>
        {counter && maxLength ? (
          <span className="numeric text-[0.75rem] text-ink-faint" aria-hidden="true">
            {used}/{maxLength}
          </span>
        ) : null}
      </div>

      <textarea
        {...props}
        id={textareaId}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'min-h-[88px] resize-none rounded-md border bg-surface px-3 py-2.5 text-[0.9375rem] text-ink outline-none',
          'transition-colors duration-150 placeholder:text-ink-faint',
          'focus:border-brand-line focus:bg-surface-2',
          error ? 'border-down/60' : 'border-line-strong hover:border-ink-faint/50',
          className,
        )}
      />

      {error ? (
        <p id={errorId} role="alert" className="text-[0.8125rem] text-down">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[0.8125rem] text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
