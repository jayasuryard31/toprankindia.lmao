import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface StateBlockProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  tone?: 'neutral' | 'error'
  /** Big monospace glyph — keeps empty screens from feeling broken. */
  glyph?: string
  className?: string
}

/** Shared shell for empty, error and not-found states. */
export function StateBlock({
  title,
  description,
  action,
  tone = 'neutral',
  glyph = '—',
  className,
}: StateBlockProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn(
        'flex animate-fade flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center',
        tone === 'error' ? 'border-down/30 bg-down/[0.04]' : 'border-line-strong bg-surface/50',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'numeric text-3xl',
          tone === 'error' ? 'text-down/70' : 'text-ink-faint/60',
        )}
      >
        {glyph}
      </span>

      <h3 className="text-base font-semibold text-ink">{title}</h3>

      {description && (
        <p className="max-w-sm text-[0.875rem] leading-relaxed text-ink-muted">{description}</p>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
