import { Link } from 'react-router-dom'
import { usePageMeta } from '@/hooks/usePageMeta'
import { buttonStyles } from '@/components/ui/button-styles'

export function NotFoundPage() {
  usePageMeta('Page not found')

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="numeric text-6xl font-semibold text-ink-faint/50">404</p>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">
        Nothing ranked here.
      </h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
        This page isn't on the board. The leaderboard is where everything happens anyway.
      </p>
      <Link to="/" className={buttonStyles({ size: 'lg', className: 'mt-8' })}>
        Back to the leaderboard
      </Link>
    </div>
  )
}
