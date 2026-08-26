import { Link } from 'react-router-dom'
import { USE_MOCK_API } from '@/services/config'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-faint">
            A leaderboard you climb with money. Highest bid takes the top spot — until someone
            wants it more.
          </p>
        </div>

        <nav aria-label="Footer" className="flex gap-12">
          <div className="flex flex-col gap-2.5">
            <p className="eyebrow">Product</p>
            <FooterLink to="/">Leaderboard</FooterLink>
            <FooterLink to="/how-it-works">How it works</FooterLink>
            <FooterLink to="/submit">Add a project</FooterLink>
            <FooterLink to="/my-project">My project</FooterLink>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="eyebrow">Rules</p>
            <span className="text-[0.8125rem] text-ink-faint">Highest bid wins</span>
            <span className="text-[0.8125rem] text-ink-faint">Ties: first there holds</span>
            <span className="text-[0.8125rem] text-ink-faint">One project per account</span>
          </div>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-[0.75rem] text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="numeric">© {new Date().getFullYear()} TopRank</p>
          {USE_MOCK_API && (
            <p>
              <span className="text-ink-muted">Demo build.</span> Every project, bid and bidder on
              this site is fictional. No payments are processed.
            </p>
          )}
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="text-[0.8125rem] text-ink-muted transition-colors hover:text-brand"
    >
      {children}
    </Link>
  )
}
