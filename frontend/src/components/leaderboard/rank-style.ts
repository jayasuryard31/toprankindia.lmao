/**
 * Rank treatments. Gold is the product's accent colour rather than a literal
 * medal: #1 wears the brand, #2 is cold silver, #3 warm bronze, and everyone
 * else is quiet until they climb.
 */
export interface RankStyle {
  /** Text colour for the rank numeral and amount. */
  text: string
  border: string
  /** Faint fill behind the rank chip. */
  chip: string
  label: string
}

const styles: Record<1 | 2 | 3, RankStyle> = {
  1: {
    text: 'text-rank-1',
    border: 'border-brand-line',
    chip: 'bg-brand-soft',
    label: 'Leading',
  },
  2: {
    text: 'text-rank-2',
    border: 'border-rank-2/25',
    chip: 'bg-rank-2/10',
    label: 'Runner-up',
  },
  3: {
    text: 'text-rank-3',
    border: 'border-rank-3/25',
    chip: 'bg-rank-3/10',
    label: 'Third',
  },
}

const rest: RankStyle = {
  text: 'text-ink-muted',
  border: 'border-line',
  chip: 'bg-surface-2',
  label: 'Contender',
}

export function rankStyle(rank: number): RankStyle {
  return rank === 1 || rank === 2 || rank === 3 ? styles[rank] : rest
}
