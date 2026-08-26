import { IconX } from "./Icons";

export default function ErrorState({ message = "Failed to load board data.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-rose-200/50 dark:border-rose-900/30 bg-rose-500/5 dark:bg-rose-500/10 backdrop-blur-sm">
      <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
        <IconX className="w-5 h-5" />
      </div>
      <p className="text-charcoal dark:text-white font-medium text-base mb-1">{message}</p>
      <p className="text-muted text-xs mb-5">Please check your connection and try again</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 bg-surface dark:bg-surface-soft border border-border/80 hover:border-coral/40 text-charcoal dark:text-white rounded-xl hover:text-coral transition-all text-xs font-semibold uppercase tracking-wider shadow-sm cursor-pointer"
        >
          Retry Request
        </button>
      )}
    </div>
  );
}
