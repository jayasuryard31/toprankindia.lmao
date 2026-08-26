import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useBidFlow } from '@/context/bid-flow-context'
import { Button } from '@/components/ui/Button'
import { CloseIcon, MenuIcon } from '@/components/ui/icons'
import { Logo } from './Logo'
import { UserMenu } from './UserMenu'

const links = [
  { to: '/', label: 'Leaderboard', end: true },
  { to: '/how-it-works', label: 'How it works', end: false },
  { to: '/my-project', label: 'My project', end: false },
]

export function Header() {
  const { openBid } = useBidFlow()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden md:ml-4 md:flex md:items-center md:gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-[0.875rem] whitespace-nowrap transition-colors',
                  isActive ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <UserMenu />
          </div>

          <Button size="sm" onClick={() => openBid()}>
            <span className="hidden sm:inline">Place your bid</span>
            <span className="sm:hidden">Bid</span>
          </Button>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="grid size-9 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink md:hidden"
          >
            {menuOpen ? <CloseIcon className="size-4" /> : <MenuIcon className="size-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-nav"
          className="animate-fade border-t border-line bg-canvas px-4 pt-2 pb-4 md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-3 text-[0.9375rem] transition-colors',
                    isActive ? 'bg-surface-2 text-ink' : 'text-ink-muted hover:bg-surface',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-3 border-t border-line pt-3 sm:hidden">
            <UserMenu />
          </div>
        </div>
      )}
    </header>
  )
}
