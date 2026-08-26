import { IconSparkle, IconArrowUpRight } from "./Icons";

export default function EmptyState({
  title = "Nothing here yet.",
  message = "Someone has to take the first spot on the board.",
  actionText = "GO TOP ↗",
  onAction,
}) {
  const handleScrollToSubmit = () => {
    if (onAction) {
      onAction();
      return;
    }
    const el = document.getElementById("submission-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      const input = el.querySelector("input");
      if (input) input.focus();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border/80 dark:border-border/80 bg-surface/50 dark:bg-surface-soft/40 backdrop-blur-sm">
      <div className="w-12 h-12 rounded-2xl bg-coral/10 dark:bg-coral/20 text-coral flex items-center justify-center mb-4 shadow-sm">
        <IconSparkle className="w-6 h-6 animate-pulse" />
      </div>
      <h3 className="font-serif text-2xl font-normal text-charcoal dark:text-white mb-1.5">
        {title}
      </h3>
      <p className="text-muted text-sm max-w-sm mb-6">
        {message}
      </p>
      <button
        onClick={handleScrollToSubmit}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white text-xs font-bold uppercase tracking-wider shadow-feather-coral transition-all hover:-translate-y-0.5 cursor-pointer"
      >
        <span>{actionText}</span>
        <IconArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
