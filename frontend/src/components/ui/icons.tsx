/**
 * Inline icons. Small enough that a dependency would cost more than it saves.
 * All are decorative — meaning comes from the surrounding label.
 */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  'aria-hidden': true as const,
  focusable: 'false' as const,
}

export function CaretUp({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} viewBox="0 0 12 12" fill="none" className={className}>
      <path d="M6 2.5L10 8.5H2L6 2.5Z" fill="currentColor" />
    </svg>
  )
}

export function CaretDown({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} viewBox="0 0 12 12" fill="none" className={className}>
      <path d="M6 9.5L2 3.5H10L6 9.5Z" fill="currentColor" />
    </svg>
  )
}

export function ArrowUpRight({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M5 11L11 5M11 5H6M11 5v5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ArrowRight({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Check({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Plus({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function MenuIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M2 5h12M2 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CloseIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronDown({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M4 6.5L8 10.5l4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Sparkline({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} viewBox="0 0 24 12" fill="none" className={className}>
      <path
        d="M1 10.5l4.5-4 3.5 2.5L14 2l4 4 5-5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function GoogleMark({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} viewBox="0 0 18 18" className={className}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}
