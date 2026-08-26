import { useState } from 'react'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<AvatarSize, string> = {
  xs: 'size-5 text-[0.5625rem]',
  sm: 'size-7 text-[0.625rem]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-16 text-lg',
}

export interface AvatarProps {
  name: string
  src?: string | null
  /** 0–360. Gives every project and person a stable identity colour. */
  hue?: number
  size?: AvatarSize
  shape?: 'circle' | 'square'
  className?: string
}

/**
 * Monogram avatar with an optional image. The fallback is the default rather
 * than an afterthought — most demo projects have no logo, and a tinted monogram
 * looks deliberate instead of broken.
 */
export function Avatar({
  name,
  src,
  hue = 210,
  size = 'md',
  shape = 'circle',
  className,
}: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden border font-semibold select-none',
        shape === 'circle' ? 'rounded-full' : 'rounded-[10px]',
        sizes[size],
        className,
      )}
      style={{
        backgroundColor: `hsl(${hue} 42% 13%)`,
        borderColor: `hsl(${hue} 40% 24%)`,
        color: `hsl(${hue} 70% 72%)`,
      }}
    >
      {showImage ? (
        <img
          src={src!}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true" className="tracking-tight">
          {initials(name)}
        </span>
      )}
    </span>
  )
}
