import { Link, useLocation } from "react-router-dom";

export default function Footer() {
  const location = useLocation();

  if (location.pathname === "/") {
    return null;
  }
  return (
    <footer className="mt-20 border-t border-border/70 dark:border-border/70 bg-surface/60 dark:bg-surface-soft/40 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Manifesto */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/toprankindiaLOGO.png"
                alt="TopRankPlots"
                className="h-7 w-auto object-contain"
              />
              <span className="font-bold text-base tracking-tight text-charcoal dark:text-cream group-hover:text-coral transition-colors flex items-center">
                TopRank<span className="text-coral">Plots</span>
              </span>
            </Link>
            <span className="hidden sm:inline text-muted/40">•</span>
            <p className="text-xs text-muted">
              The 3D global virtual metropolis &amp; living product economy.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 text-xs font-semibold text-muted">
            <Link to="/" className="hover:text-coral transition-colors">Leaderboard</Link>
            <Link to="/categories" className="hover:text-coral transition-colors">Categories</Link>
            <Link to="/about" className="hover:text-coral transition-colors">About & Metropolis</Link>
          </div>
        </div>

        {/* Bottom copyright & legal */}
        <div className="mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-light">
          <div className="flex items-center gap-4">
            <span>Metropolis Architecture</span>
            <span>·</span>
            <span>Terms &amp; Plots</span>
            <span>·</span>
            <span>Global Privacy</span>
          </div>
          <p>© 2026 TopRankPlots. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
