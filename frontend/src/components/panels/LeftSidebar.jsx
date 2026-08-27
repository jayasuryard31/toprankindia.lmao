import { useStats } from "../../hooks/useStats";
import { formatINR } from "../../utils/formatINR";
import { IconGrid, IconCrown, IconSearch } from "../common/Icons";

export default function LeftSidebar({
  categories = [],
  activeCategoryId,
  onSelectCategory,
  onFocusTopSpot,
  onOpenSearch,
}) {
  const { data: stats } = useStats();

  const totalAmount = stats?.totalCollected ?? 1360657;
  const productsLive = stats?.totalProducts ?? 1247;
  const totalPayments = stats?.totalPayments ?? 340;

  const districtColors = {
    1: "#8B5CF6",
    2: "#3B82F6",
    3: "#F05A38",
    4: "#EC4899",
    5: "#D946EF",
    6: "#F59E0B",
    7: "#6366F1",
    8: "#10B981",
    9: "#14B8A6",
    10: "#0EA5E9",
    11: "#84CC16",
    12: "#F43F5E",
    13: "#8B5CF6",
    14: "#06B6D4",
    15: "#78716C",
  };

  return (
    <div className="w-64 sm:w-72 flex-shrink-0 flex flex-col gap-3 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide select-none pointer-events-auto">
      {/* 1. Velora Harbor Overview Card */}
      <div className="glass-panel p-4 rounded-3xl shadow-feather border border-border/80">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-xs uppercase tracking-wider text-charcoal dark:text-cream">
            Velora Harbor
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>
        <p className="text-[10px] text-muted mb-3 font-medium">Coastal Bidding Metropolis</p>

        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border/50">
          <div>
            <span className="text-[10px] text-muted block mb-0.5">Buildings</span>
            <span className="font-mono text-sm font-bold text-charcoal dark:text-white">
              {productsLive.toLocaleString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted block mb-0.5">Payments</span>
            <span className="font-mono text-sm font-bold text-charcoal dark:text-white">
              {totalPayments.toLocaleString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted block mb-0.5">Total Value</span>
            <span className="font-mono text-xs font-black text-coral truncate block">
              {formatINR(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Search & Focus Shortcuts */}
      <div className="glass-panel p-2 rounded-2xl shadow-feather border border-border/80 flex flex-col gap-1">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-charcoal dark:text-cream hover:bg-surface-soft dark:hover:bg-elevated transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <IconSearch className="w-3.5 h-3.5 text-muted" />
            <span>Explore Products</span>
          </div>
          <kbd className="text-[10px] font-mono bg-surface dark:bg-surface px-1.5 py-0.5 rounded border border-border/60 text-muted">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={onFocusTopSpot}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <IconCrown className="w-3.5 h-3.5" />
            <span>Focus #1 Landmark</span>
          </div>
          <span className="text-[10px] font-bold">Center ↗</span>
        </button>
      </div>

      {/* 3. Category Districts */}
      <div className="glass-panel p-3.5 rounded-3xl shadow-feather border border-border/80">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="font-bold text-[11px] uppercase tracking-wider text-muted">
            City Districts
          </span>
          {activeCategoryId && (
            <button
              onClick={() => onSelectCategory(null)}
              className="text-[10px] font-semibold text-coral hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* All Districts Button */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold mb-1 transition-all cursor-pointer ${
            activeCategoryId === null
              ? "bg-coral/10 text-coral font-bold shadow-sm border border-coral/20"
              : "text-charcoal dark:text-cream hover:bg-surface-soft dark:hover:bg-elevated"
          }`}
        >
          <div className="flex items-center gap-2">
            <IconGrid className="w-3.5 h-3.5" />
            <span>All Districts</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-soft dark:bg-elevated text-muted">
            {productsLive}
          </span>
        </button>

        {/* District Rows */}
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto scrollbar-hide py-1">
          {categories?.map((cat) => {
            const isSelected = activeCategoryId === cat.id;
            const markerColor = districtColors[cat.id] || "#F05A38";
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                  isSelected
                    ? "bg-coral/10 text-coral font-bold border border-coral/20"
                    : "text-muted hover:text-charcoal dark:hover:text-cream hover:bg-surface-soft dark:hover:bg-elevated"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: markerColor }}
                  />
                  <span className="truncate max-w-[130px]">{cat.name}</span>
                </div>
                <span className="text-[10px] font-mono text-muted">
                  {cat.productCount || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
