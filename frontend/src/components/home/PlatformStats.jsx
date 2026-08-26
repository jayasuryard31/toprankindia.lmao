import { useStats } from "../../hooks/useStats";
import { formatINR } from "../../utils/formatINR";
import Skeleton from "../common/Skeleton";
import { IconTrendUp } from "../common/Icons";

export default function PlatformStats() {
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return <Skeleton className="h-64 rounded-3xl" />;
  }

  const totalAmount = stats?.totalCollected ?? 1360657;
  const productsLive = stats?.totalProducts ?? 245;
  const totalPayments = stats?.totalPayments ?? 912;
  const categoriesCount = stats?.totalCategories ?? 15;
  const activeToday = stats?.activeProducts ?? 240;

  return (
    <div
      id="platform-overview"
      className="glass-panel p-5 sm:p-6 rounded-3xl shadow-feather border border-border/80 relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-xs sm:text-sm text-charcoal dark:text-cream uppercase tracking-wider">
          Platform Overview
        </h3>
        <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <IconTrendUp className="w-4 h-4" />
        </span>
      </div>

      {/* Main Revenue Headline */}
      <div className="mb-6 p-4 rounded-2xl bg-surface-soft dark:bg-elevated border border-border/60 text-center">
        <div className="font-mono text-2xl sm:text-3xl font-black text-charcoal dark:text-white tracking-tight">
          {formatINR(totalAmount)}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted mt-0.5 block">
          Total Collected
        </span>
      </div>

      {/* 2x2 Metric Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl bg-surface dark:bg-surface border border-border/70 text-center">
          <div className="font-mono text-lg font-bold text-charcoal dark:text-white">
            {productsLive.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mt-0.5">
            Products Live
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-surface dark:bg-surface border border-border/70 text-center">
          <div className="font-mono text-lg font-bold text-charcoal dark:text-white">
            {totalPayments.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mt-0.5">
            Total Payments
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-surface dark:bg-surface border border-border/70 text-center">
          <div className="font-mono text-lg font-bold text-charcoal dark:text-white">
            {categoriesCount}
          </div>
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mt-0.5">
            Categories
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-surface dark:bg-surface border border-border/70 text-center">
          <div className="font-mono text-lg font-bold text-coral">
            {activeToday.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mt-0.5">
            Active Today
          </span>
        </div>
      </div>
    </div>
  );
}
