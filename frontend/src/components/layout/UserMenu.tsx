import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ChevronDown } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Logged-out, loading and logged-in states for the account corner.
 */
export function UserMenu() {
  const { status, user, session, openAuth, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (status === 'loading') {
    return <Skeleton className="h-9 w-9 sm:w-24" rounded="md" />
  }

  if (status === 'anonymous' || !user) {
    return (
      <Button variant="ghost" size="sm" onClick={() => openAuth('sign-in')}>
        Sign in
      </Button>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-surface-2"
      >
        <Avatar name={user.name} src={user.avatarUrl} hue={user.hue} size="sm" />
        <span className="hidden max-w-24 truncate text-[0.8125rem] text-ink-muted lg:block">
          {user.name}
        </span>
        <ChevronDown className="size-3.5 text-ink-faint" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 animate-pop overflow-hidden rounded-lg border border-line-strong bg-surface-2 p-1.5 shadow-pop"
        >
          <div className="border-b border-line px-2.5 pt-1.5 pb-2.5">
            <p className="truncate text-[0.875rem] font-medium text-ink">{user.name}</p>
            <p className="numeric truncate text-[0.75rem] text-ink-faint">@{user.handle}</p>
          </div>

          <Link
            to="/my-project"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1.5 flex items-center justify-between rounded-sm px-2.5 py-2 text-[0.875rem] text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
          >
            My project
            {!session?.projectId && (
              <span className="eyebrow text-brand">Add</span>
            )}
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void signOut()
            }}
            className="flex w-full items-center rounded-sm px-2.5 py-2 text-left text-[0.875rem] text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
