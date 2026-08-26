import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a hover lift — only for cards that are actually interactive. */
  interactive?: boolean
  padded?: boolean
}

export function Card({
  interactive = false,
  padded = true,
  className,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-lg border border-line bg-surface',
        padded && 'p-5',
        interactive &&
          'transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-2',
        className,
      )}
    />
  )
}
