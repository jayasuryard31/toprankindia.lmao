import { cn } from '@/lib/cn'

const radii = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
} as const

export function Skeleton({
  className,
  rounded = 'md',
}: {
  className?: string
  rounded?: keyof typeof radii
}) {
  return <div aria-hidden="true" className={cn('skeleton', radii[rounded], className)} />
}
