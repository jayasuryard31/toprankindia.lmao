import { Link } from "react-router-dom";
import { formatINR } from "../../utils/formatINR";
import { timeAgo } from "../../utils/formatDate";
import { trackClick } from "../../services/productsApi";
import LogoFallback from "../common/LogoFallback";

export default function PodiumLeaderboard({ products = [] }) {
  if (!products || products.length === 0) return null;

  const top3 = products.slice(0, 3);
  const rank1 = top3[0];
  const rank2 = top3[1];
  const rank3 = top3[2];

  const handleClick = (id) => {
    if (id) {
      try {
        trackClick(id);
      } catch (err) {
        void err;
      }
    }
  };

  const renderCard = (product, rank, isCenter = false) => {
    if (!product) return null;

    // Config matching the screenshot
    const config = {
      1: {
        badgeBg: "bg-[#FCD34D] text-[#78350F]", // Warm golden yellow
        cardBg: "bg-gradient-to-b from-[#FFFDF0] to-[#FFFFFF] dark:from-[#231F17] dark:to-[#1B1815]",
        borderColor: "border-[#FDE68A] dark:border-amber-500/30",
        shadow: "shadow-[0_12px_36px_-6px_rgba(245,158,11,0.15)]",
        categoryBadge: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40",
      },
      2: {
        badgeBg: "bg-[#E2E8F0] text-[#334155] dark:bg-stone-700 dark:text-stone-200", // Soft silver
        cardBg: "bg-gradient-to-b from-[#F5F3FF] via-[#FAFAFA] to-[#FFFFFF] dark:from-[#1E1B26] dark:to-[#1B1815]",
        borderColor: "border-[#E2E8F0] dark:border-stone-800",
        shadow: "shadow-feather",
        categoryBadge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40",
      },
      3: {
        badgeBg: "bg-[#FED7AA] text-[#9A3412] dark:bg-orange-950/80 dark:text-orange-300", // Soft bronze/peach
        cardBg: "bg-gradient-to-b from-[#FFF7ED] via-[#FAFAFA] to-[#FFFFFF] dark:from-[#261E1A] dark:to-[#1B1815]",
        borderColor: "border-[#FFEDD5] dark:border-stone-800",
        shadow: "shadow-feather",
        categoryBadge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40",
      },
    };

    const cfg = config[rank] || config[2];

    return (
      <Link
        key={product.id}
        to={`/products/${product.id}`}
        onClick={() => handleClick(product.id)}
        className={`group relative flex flex-col items-center text-center p-6 rounded-3xl transition-all duration-300 border ${cfg.borderColor} ${cfg.cardBg} ${cfg.shadow} hover:-translate-y-1.5 hover:shadow-feather-lg ${
          isCenter ? "order-1 lg:order-2 lg:-translate-y-3 z-10" : rank === 2 ? "order-2 lg:order-1" : "order-3"
        }`}
      >
        {/* Floating Circle Rank Badge on Top */}
        <div
          className={`absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${cfg.badgeBg}`}
        >
          {rank}
        </div>

        {/* Sparkle Accents */}
        {isCenter ? (
          <>
            <span className="absolute top-3 left-4 text-amber-400 text-xs select-none">✦</span>
            <span className="absolute top-4 right-4 text-amber-400 text-xs select-none">✦</span>
          </>
        ) : (
          <span className="absolute top-4 right-4 text-stone-400 text-xs select-none">✦</span>
        )}

        {/* Squircle Logo Avatar */}
        <div className="relative mt-2 mb-3">
          {product.logoUrl ? (
            <img
              src={product.logoUrl}
              alt={product.websiteName}
              className="w-16 h-16 rounded-2xl object-cover border border-border/80 shadow-sm"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <LogoFallback
            name={product.websiteName}
            className={`w-16 h-16 rounded-2xl text-xl font-bold shadow-sm ${
              product.logoUrl ? "hidden" : "flex"
            }`}
          />
        </div>

        {/* Product Title */}
        <h3 className="font-bold text-base text-charcoal dark:text-white truncate max-w-full group-hover:text-coral transition-colors">
          {product.websiteName}
        </h3>

        {/* Short Subtitle / Description */}
        <p className="text-xs text-muted mt-1 line-clamp-2 min-h-[32px] px-2 leading-relaxed">
          {product.description || product.websiteUrl}
        </p>

        {/* Category Pill */}
        <div className="mt-3">
          <span className={`inline-block text-[11px] font-semibold px-3 py-1 rounded-full ${cfg.categoryBadge}`}>
            {product.category?.name || "AI Agents & Infra"}
          </span>
        </div>

        {/* Spend Amount & Micro Stats */}
        <div className="mt-4 pt-3 border-t border-border/50 w-full">
          <div className="font-mono text-xl font-black text-coral">
            {formatINR(product.currentAmount)}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-muted font-medium">
            <span>{product.clickCount != null ? `${product.clickCount} clicks` : "0 clicks"}</span>
            <span>•</span>
            <span>{timeAgo(product.createdAt)}</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 items-end pt-3">
        {/* Left: #2 */}
        {rank2 && renderCard(rank2, 2)}

        {/* Center: #1 (Hero spot) */}
        {rank1 && renderCard(rank1, 1, true)}

        {/* Right: #3 */}
        {rank3 && renderCard(rank3, 3)}
      </div>
    </div>
  );
}
