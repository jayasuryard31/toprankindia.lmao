import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label: string
  /** Helper text under the field. Hidden while an error is showing. */
  hint?: ReactNode
  error?: string | null
  /** Fixed adornment inside the field, e.g. `$` or `https://`. */
  prefix?: ReactNode
  suffix?: ReactNode
  inputSize?: 'md' | 'lg'
  /** Visually hides the label but keeps it for screen readers. */
  hideLabel?: boolean
  containerClassName?: string
}

export function Input({
  label,
  hint,
  error,
  prefix,
  suffix,
  inputSize = 'md',
  hideLabel = false,
  containerClassName,
  className,
  id,
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`

  return (
    <div className={cn('flex flex-col gap-2', containerClassName)}>
      <label
        htmlFor={inputId}
        className={cn(
          'text-[0.8125rem] font-medium text-ink-muted',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>

      <div
        className={cn(
          'group flex items-center gap-2 rounded-md border bg-surface px-3',
          'transition-colors duration-150',
          'focus-within:border-brand-line focus-within:bg-surface-2',
          inputSize === 'lg' ? 'h-14' : 'h-11',
          error ? 'border-down/60' : 'border-line-strong hover:border-ink-faint/50',
        )}
      >
        {prefix && (
          <span
            aria-hidden="true"
            className={cn(
              'shrink-0 font-mono text-ink-faint',
              inputSize === 'lg' ? 'text-2xl' : 'text-sm',
            )}
          >
            {prefix}
          </span>
        )}

        <input
          {...props}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-faint',
            inputSize === 'lg' ? 'numeric text-2xl font-medium' : 'text-[0.9375rem]',
            className,
          )}
        />

        {suffix && <span className="shrink-0 text-sm text-ink-faint">{suffix}</span>}
      </div>

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
