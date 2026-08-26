import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'
import { buttonStyles } from './button-styles'
import type { ButtonSize, ButtonVariant } from './button-styles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  /** Announced while `loading` — keeps screen readers in the loop. */
  loadingLabel?: string
  children?: ReactNode
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  loadingLabel = 'Working…',
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, fullWidth, className })}
    >
      {loading && <Spinner />}
      {loading && <span className="sr-only">{loadingLabel}</span>}
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-70')}>
        {children}
      </span>
    </button>
  )
}
