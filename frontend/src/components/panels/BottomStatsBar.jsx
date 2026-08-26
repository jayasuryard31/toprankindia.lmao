import { useStats } from "../../hooks/useStats";
import { formatINR } from "../../utils/formatINR";

export default function BottomStatsBar() {
  const { data: stats } = useStats();

  const totalAmount = stats?.totalCollected ?? 1360657;
  const productsLive = stats?.totalProducts ?? 245;
  const categoriesCount = stats?.totalCategories ?? 15;
  const activeToday = stats?.activeProducts ?? 240;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 hidden lg:flex items-center gap-6 px-6 py-2 rounded-2xl glass-panel shadow-feather-lg border border-border/80 text-xs font-semibold select-none">
      <div className="flex items-center gap-2">
        <span className="text-base">🏢</span>
        <div>
          <span className="font-mono font-bold text-charcoal dark:text-white block leading-tight">
            {productsLive}
          </span>
          <span className="text-[10px] text-muted uppercase tracking-wider block">
            Buildings
          </span>
        </div>
      </div>

      <div className="h-6 w-px bg-border/60" />

      <div className="flex items-center gap-2">
        <span className="text-base">💰</span>
        <div>
          <span className="font-mono font-black text-coral block leading-tight">
            {formatINR(totalAmount)}
          </span>
          <span className="text-[10px] text-muted uppercase tracking-wider block">
            Total Value
          </span>
        </div>
      </div>

      <div className="h-6 w-px bg-border/60" />

      <div className="flex items-center gap-2">
        <span className="text-base">🏷</span>
        <div>
          <span className="font-mono font-bold text-charcoal dark:text-white block leading-tight">
            {categoriesCount}
          </span>
          <span className="text-[10px] text-muted uppercase tracking-wider block">
            Districts
          </span>
        </div>
      </div>

      <div className="h-6 w-px bg-border/60" />

      <div className="flex items-center gap-2">
        <span className="text-base">⚡</span>
        <div>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block leading-tight">
            {activeToday}
          </span>
          <span className="text-[10px] text-muted uppercase tracking-wider block">
            Active Today
          </span>
        </div>
      </div>
    </div>
  );
}

