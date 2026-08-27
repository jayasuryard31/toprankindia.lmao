import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useMapStore } from "../map/useMapStore";
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
  const inCity = useMapStore((s) => s.inCity);

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

  // Walking the city is a full-screen experience — the site chrome would sit
  // on top of the game HUD, so it unmounts for the duration.
  if (inCity) return null;

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-surface/95 dark:bg-background/95 backdrop-blur-md border-b border-border/80 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Official TopRankPlots Logo & Typography */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group select-none flex-shrink-0"
          >
            <img
              src="/toprankindiaLOGO.png"
              alt="TopRankPlots Logo"
              className="h-7 sm:h-8 w-auto object-contain hover:scale-105 transition-transform"
            />
            <span className="font-bold text-base sm:text-lg tracking-tight text-charcoal dark:text-cream group-hover:text-coral transition-colors flex items-center">
              TopRank<span className="text-coral">Plots</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
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
          </nav>

          {/* Actions: Search, Theme Toggle, Profile */}
          <div className="flex items-center gap-2">
            {/* Command Palette Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-soft/80 dark:bg-elevated/80 border border-border hover:border-coral/40 text-muted hover:text-charcoal dark:hover:text-cream text-xs transition-all shadow-sm group cursor-pointer"
              title="Search products & plots (⌘K)"
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

            {/* Global Metropolis Badge */}
            <div
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-200 to-indigo-200 dark:from-sky-900/60 dark:to-indigo-900/60 border border-border flex items-center justify-center text-xs font-bold text-sky-600 dark:text-sky-400 select-none shadow-sm cursor-pointer overflow-hidden"
              title="TopRankPlots Global Metropolis"
            >
              <span className="text-[13px]">🌐</span>
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
          <div className="md:hidden px-4 py-3 bg-surface/98 dark:bg-background/98 border-b border-border/80 shadow-md flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-150">
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
