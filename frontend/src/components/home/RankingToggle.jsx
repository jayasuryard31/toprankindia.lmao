export default function RankingToggle({ value, onChange }) {
  const options = [
    { id: "all", label: "All-time" },
    { id: "today", label: "Today" },
  ];

  return (
    <div className="inline-flex items-center p-1 rounded-2xl bg-surface-soft/80 dark:bg-elevated/70 border border-border/80 shadow-inner">
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              isActive
                ? "bg-surface dark:bg-surface text-charcoal dark:text-white shadow-sm font-bold"
                : "text-muted hover:text-charcoal dark:hover:text-cream"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                isActive ? "bg-coral animate-pulse" : "bg-muted-light/50"
              }`}
            />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
