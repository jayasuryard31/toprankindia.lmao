import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { useCountUp } from '@/hooks/useCountUp'

export type BidAmountSize = 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<BidAmountSize, string> = {
  sm: 'text-[0.9375rem]',
  md: 'text-lg sm:text-xl',
  lg: 'text-2xl sm:text-3xl',
  xl: 'text-4xl sm:text-5xl',
}

export interface BidAmountProps {
  amount: number
  size?: BidAmountSize
  className?: string
  /** Animate to the new value. Off inside long lists to keep scrolling cheap. */
  animate?: boolean
}

/** Money, always monospaced and tabular so columns line up down the board. */
export function BidAmount({ amount, size = 'md', className, animate = false }: BidAmountProps) {
  const animated = useCountUp(animate ? amount : 0)
  const value = animate ? animated : amount

  return (
    <output
      className={cn('numeric block leading-none font-semibold', sizes[size], className)}
      aria-label={`Current bid ${formatMoney(amount)}`}
    >
      {formatMoney(value)}
    </output>
  )
}
