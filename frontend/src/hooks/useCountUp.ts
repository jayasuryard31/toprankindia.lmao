import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Animates a number toward its new value. Used on bid amounts so money reads as
 * something that *moves*. Skips straight to the value on first paint and for
 * anyone who has asked for reduced motion.
 */
export function useCountUp(value: number, duration = 650): number {
  const [display, setDisplay] = useState(value)
  const previous = useRef(value)
  const frame = useRef(0)

  useEffect(() => {
    const from = previous.current
    previous.current = value

    if (from === value || prefersReducedMotion()) {
      setDisplay(value)
      return
    }

    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutQuint — fast off the line, settles gently.
      const eased = 1 - Math.pow(1 - t, 5)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }

    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [value, duration])

  return display
}
