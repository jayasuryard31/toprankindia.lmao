import { IconArrowRight } from "../common/Icons";

export default function LiveStats({ stats }) {
  const handleScrollToStats = () => {
    const el = document.getElementById("platform-overview");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const visitsCount = stats?.totalVisits || 1360657;
  const onlineCount = 267;

  return (
    <div className="flex items-center justify-center pt-3 pb-2">
      <div className="glass-pill px-4 py-1.5 rounded-full flex items-center gap-3 text-xs shadow-sm flex-wrap justify-center border border-border/80">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-charcoal dark:text-cream">
            {onlineCount} people online
          </span>
        </div>

        <span className="text-muted/40 hidden sm:inline">|</span>

        <span className="text-muted hidden sm:inline">
          {visitsCount.toLocaleString("en-IN")} visits since launch
        </span>

        <button
          onClick={handleScrollToStats}
          className="font-medium text-coral hover:text-coral-hover flex items-center gap-1 transition-colors group ml-1"
        >
          <span>See live stats</span>
          <IconArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
