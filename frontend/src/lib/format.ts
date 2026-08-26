import type { Money } from '@/types'

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const dateOnly = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const timeOnly = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

/** `1240` → `$1,240` */
export function formatMoney(amount: Money): string {
  return usd.format(amount)
}

/** `142000` → `$142k` — for stat strips where width is tight. */
export function formatCompactMoney(amount: Money): string {
  if (amount < 10_000) return usd.format(amount)
  if (amount < 1_000_000) return `$${Math.round(amount / 1000)}k`
  return `$${(amount / 1_000_000).toFixed(1)}m`
}

/** `Aug 26, 2026` */
export function formatDate(iso: string): string {
  return dateOnly.format(new Date(iso))
}

/** `Aug 26, 2026 · 2:41 PM` */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return `${dateOnly.format(date)} · ${timeOnly.format(date)}`
}

/**
 * Compact elapsed time: `just now`, `14m ago`, `2h 14m ago`, `3d ago`.
 * Kept short so it never wraps inside a leaderboard row.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))

  if (seconds < 45) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    const rest = minutes % 60
    return rest ? `${hours}h ${rest}m ago` : `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  return formatDate(iso)
}

/** Strips protocol and trailing slash: `https://gaeon.in/` → `gaeon.in` */
export function toDomain(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}

/** `gaeon.in` → `https://gaeon.in` (leaves an existing protocol alone). */
export function toAbsoluteUrl(input: string): string {
  const trimmed = input.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** First letters of up to two words: `Loop Ledger` → `LL`. */
export function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')
}

/** `1` → `1st`, `2` → `2nd`, `13` → `13th` */
export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}
