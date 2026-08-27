import { useState } from "react";

export default function LogoFallback({
  src = "",
  name = "",
  size = 36,
  className = "",
  alt = "",
}) {
  const [error, setError] = useState(false);

  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const palettes = [
    "from-orange-500/20 to-amber-500/10 text-orange-600 dark:text-orange-300 border-orange-200 dark:border-orange-800/40",
    "from-indigo-500/20 to-purple-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40",
    "from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
    "from-rose-500/20 to-pink-500/10 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/40",
    "from-sky-500/20 to-blue-500/10 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-800/40",
  ];

  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = (name.charCodeAt(i) + ((hash << 5) - hash)) % palettes.length;
  }
  const selectedPalette = palettes[Math.abs(hash) % palettes.length];

  if (src && !error) {
    return (
      <img
        src={src}
        alt={alt || name}
        onError={() => setError(true)}
        className={`w-full h-full object-contain max-h-full max-w-full rounded-lg ${className}`}
        style={{ maxHeight: `${size}px`, maxWidth: `${size * 2}px` }}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center font-black tracking-tight rounded-xl bg-gradient-to-br border select-none shadow-xs ${selectedPalette} ${className}`}
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, size * 0.42)}px` }}
    >
      <span>{initials || "TRI"}</span>
    </div>
  );
}
