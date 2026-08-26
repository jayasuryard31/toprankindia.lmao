import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap ' +
  'transition-[transform,background-color,border-color,color,opacity] duration-150 ease-out ' +
  'select-none disabled:pointer-events-none disabled:opacity-45 ' +
  'active:translate-y-px'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-ink hover:bg-brand-hover shadow-[0_0_0_1px_var(--color-brand)] ' +
    'hover:shadow-[0_0_24px_-6px_var(--color-brand-line)]',
  secondary:
    'bg-surface-2 text-ink border border-line-strong hover:bg-surface-3 hover:border-ink-faint/50',
  outline:
    'border border-line-strong text-ink hover:border-brand-line hover:text-brand bg-transparent',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-2',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[0.8125rem]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[0.9375rem]',
}

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}

/**
 * Shared button styling so `<button>` and react-router `<Link>` can look
 * identical without a polymorphic component.
 */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)
}
