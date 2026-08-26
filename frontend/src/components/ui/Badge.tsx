import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'brand' | 'up' | 'down' | 'warn'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-line-strong bg-surface-2 text-ink-muted',
  brand: 'border-brand-line bg-brand-soft text-brand',
  up: 'border-up/30 bg-up/10 text-up',
  down: 'border-down/30 bg-down/10 text-down',
  warn: 'border-warn/30 bg-warn/10 text-warn',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  mono?: boolean
}

export function Badge({ tone = 'neutral', mono = false, className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] leading-none font-medium',
        mono && 'numeric tracking-normal',
        tones[tone],
        className,
      )}
    />
  )
}
