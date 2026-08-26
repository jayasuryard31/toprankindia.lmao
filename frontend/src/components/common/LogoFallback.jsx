export default function LogoFallback({ name = "", className = "" }) {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // Deterministic palette based on name
  const palettes = [
    "from-orange-100 to-amber-100 text-orange-700 border-orange-200/60 dark:from-orange-950/60 dark:to-amber-950/40 dark:text-orange-300 dark:border-orange-900/40",
    "from-indigo-100 to-purple-100 text-indigo-700 border-indigo-200/60 dark:from-indigo-950/60 dark:to-purple-950/40 dark:text-indigo-300 dark:border-indigo-900/40",
    "from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200/60 dark:from-emerald-950/60 dark:to-teal-950/40 dark:text-emerald-300 dark:border-emerald-900/40",
    "from-rose-100 to-pink-100 text-rose-700 border-rose-200/60 dark:from-rose-950/60 dark:to-pink-950/40 dark:text-rose-300 dark:border-rose-900/40",
    "from-sky-100 to-blue-100 text-sky-700 border-sky-200/60 dark:from-sky-950/60 dark:to-blue-950/40 dark:text-sky-300 dark:border-sky-900/40",
    "from-violet-100 to-fuchsia-100 text-violet-700 border-violet-200/60 dark:from-violet-950/60 dark:to-fuchsia-950/40 dark:text-violet-300 dark:border-violet-900/40",
  ];

  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = (name.charCodeAt(i) + ((hash << 5) - hash)) % palettes.length;
  }
  const selectedPalette = palettes[Math.abs(hash) % palettes.length];

  return (
    <div
      className={`flex items-center justify-center font-bold tracking-tight bg-gradient-to-br border select-none shadow-sm ${selectedPalette} ${className}`}
    >
      <span>{initials || "TRI"}</span>
    </div>
  );
}
