import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import CommandSearch from "../common/CommandSearch";
import {
  IconSearch,
  IconSun,
  IconMoon,
  IconMenu,
  IconX,
  IconGrid,
  IconSparkle,
} from "../common/Icons";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Keyboard shortcut listener for ⌘K and /
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navLinks = [
    { to: "/", label: "Leaderboard", icon: IconSparkle },
    { to: "/categories", label: "Categories", icon: IconGrid },
    { to: "/about", label: "About", icon: null },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleStatsClick = () => {
    if (location.pathname !== "/") {
      navigate("/#stats");
    } else {
      const el = document.getElementById("platform-overview");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <header className="sticky top-3 z-40 px-3 sm:px-6 max-w-6xl mx-auto w-full pt-1 pb-2">
        <div className="glass-panel rounded-2xl shadow-feather flex items-center justify-between px-3 sm:px-5 h-14 transition-all duration-200">
          {/* Official TopRankIndia Logo & Typography */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group select-none flex-shrink-0"
          >
            <img
              src="/toprankindiaLOGO.png"
              alt="TopRankIndia Logo"
              className="h-7 sm:h-8 w-auto object-contain hover:opacity-95 transition-opacity"
            />
            <span className="font-bold text-base sm:text-lg tracking-tight text-charcoal dark:text-cream group-hover:text-coral transition-colors flex items-center">
              TopRank<span className="text-coral">India</span>
            </span>
          </Link>

          {/* Desktop Floating Pill Navigation */}
          <nav className="hidden md:flex items-center bg-surface-soft/80 dark:bg-elevated/70 p-1 rounded-xl border border-border-subtle shadow-inner">
            {navLinks.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    active
                      ? "bg-surface dark:bg-surface text-coral shadow-sm font-bold"
                      : "text-muted hover:text-charcoal dark:hover:text-cream"
                  }`}
                >
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />}
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={handleStatsClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-charcoal dark:hover:text-cream transition-colors cursor-pointer"
            >
              Live Stats
            </button>
          </nav>

          {/* Actions: Search, Theme Toggle, Profile */}
          <div className="flex items-center gap-2">
            {/* Command Palette Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-soft/80 dark:bg-elevated/80 border border-border hover:border-coral/40 text-muted hover:text-charcoal dark:hover:text-cream text-xs transition-all shadow-sm group cursor-pointer"
              title="Search products (⌘K)"
            >
              <IconSearch className="w-3.5 h-3.5 group-hover:text-coral transition-colors" />
              <span className="hidden sm:inline font-medium">Search</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-surface dark:bg-surface rounded border border-border/80 text-muted-light group-hover:text-coral transition-colors">
                ⌘K
              </kbd>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-charcoal dark:hover:text-white bg-surface-soft/80 dark:bg-elevated/80 border border-border hover:border-coral/40 transition-all shadow-sm cursor-pointer"
              aria-label="Toggle theme"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? (
                <IconSun className="w-4 h-4 text-amber-500" />
              ) : (
                <IconMoon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            {/* Profile Avatar / Founder Badge */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-200 to-orange-200 dark:from-amber-900/60 dark:to-orange-900/60 border border-border flex items-center justify-center text-xs font-bold text-coral select-none shadow-sm cursor-pointer overflow-hidden">
              <span className="text-[11px]">🇮🇳</span>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-charcoal dark:hover:text-white bg-surface-soft/80 dark:bg-elevated/80 border border-border transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <IconX className="w-4 h-4" /> : <IconMenu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <div className="md:hidden mt-2 p-3 glass-panel rounded-2xl shadow-feather-lg flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? "bg-coral/10 text-coral font-bold"
                      : "text-muted hover:text-charcoal dark:hover:text-white hover:bg-surface-soft dark:hover:bg-elevated"
                  }`}
                >
                  <span>{link.label}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-coral" />}
                </Link>
              );
            })}
            <button
              onClick={() => {
                handleStatsClick();
                setMobileOpen(false);
              }}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-muted hover:text-charcoal dark:hover:text-white hover:bg-surface-soft dark:hover:bg-elevated text-left transition-colors cursor-pointer"
            >
              <span>Live Stats</span>
            </button>
            <div className="pt-2 mt-1 border-t border-border/60 flex items-center justify-between px-3.5 text-xs text-muted">
              <span>Theme</span>
              <button
                onClick={toggleTheme}
                className="font-semibold text-coral flex items-center gap-1.5 cursor-pointer"
              >
                {theme === "light" ? "Light Mode" : "Dark Mode"}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Global Command Search Overlay */}
      <CommandSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
