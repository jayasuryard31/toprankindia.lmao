import { Link } from "react-router-dom";
import { formatINR } from "../../utils/formatINR";
import { timeAgo } from "../../utils/formatDate";
import { trackClick } from "../../services/productsApi";
import LogoFallback from "../common/LogoFallback";

export default function ProductCard({ product, index, overallRank }) {
  const rank = overallRank || product.rank || index + 1;

  const handleClick = () => {
    if (product.id) {
      try {
        trackClick(product.id);
      } catch (err) {
        void err;
      }
    }
  };

  // Trend indicator matching the screenshot
  const isDown = rank === 6;
  const movement = isDown ? "down" : "up";

  // Category pill color accents
  const getCategoryColor = (catName = "") => {
    const name = catName.toLowerCase();
    if (name.includes("support") || name.includes("customer")) {
      return "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40";
    }
    if (name.includes("marketing") || name.includes("ads")) {
      return "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40";
    }
    if (name.includes("productivity") || name.includes("automation")) {
      return "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40";
    }
    if (name.includes("ai") || name.includes("infra")) {
      return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40";
    }
    return "bg-surface-soft dark:bg-elevated text-muted border-border/70";
  };

  return (
    <Link
      to={`/products/${product.id}`}
      onClick={handleClick}
      className="group flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 rounded-2xl bg-surface dark:bg-surface border border-border/80 hover:border-coral/40 shadow-sm hover:shadow-feather hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Left Group: Rank, Logo, Name, Description */}
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
        {/* Rank Number */}
        <div className="w-5 text-center font-bold text-sm sm:text-base text-charcoal dark:text-cream group-hover:text-coral transition-colors flex-shrink-0">
          {rank}
        </div>

        {/* Logo Avatar */}
        <div className="relative flex-shrink-0">
          {product.logoUrl ? (
            <img
              src={product.logoUrl}
              alt={product.websiteName}
              className="w-10 h-10 rounded-xl object-cover border border-border/80 shadow-sm"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <LogoFallback
            name={product.websiteName}
            className={`w-10 h-10 rounded-xl text-sm font-bold shadow-sm ${
              product.logoUrl ? "hidden" : "flex"
            }`}
          />
        </div>

        {/* Product Details */}
        <div className="min-w-0">
          <h4 className="font-bold text-xs sm:text-sm text-charcoal dark:text-cream truncate group-hover:text-coral transition-colors">
            {product.websiteName}
          </h4>
          <p className="text-xs text-muted truncate mt-0.5 max-w-xs sm:max-w-sm">
            {product.description || product.websiteUrl}
          </p>
        </div>
      </div>

      {/* Middle: Category Pill */}
      {product.category && (
        <div className="hidden md:flex items-center flex-shrink-0">
          <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${getCategoryColor(product.category.name)}`}>
            {product.category.name}
          </span>
        </div>
      )}

      {/* Right Group: Spend Amount, Micro-Stats & Trend Arrow */}
      <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0 text-right">
        {/* Amount */}
        <span className="font-mono text-sm sm:text-base font-bold text-coral min-w-[65px] text-right">
          {formatINR(product.currentAmount)}
        </span>

        {/* Micro Stats (clicks • time) */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted font-medium min-w-[110px] justify-end">
          <span>{product.clickCount != null ? `${product.clickCount} clicks` : "0 clicks"}</span>
          <span>•</span>
          <span>{timeAgo(product.createdAt)}</span>
        </div>

        {/* Trend Arrow */}
        <div
          className={`w-5 h-5 flex items-center justify-center text-xs font-bold ${
            movement === "up"
              ? "text-emerald-500"
              : "text-rose-500"
          }`}
        >
          {movement === "up" ? "↗" : "↘"}
        </div>
      </div>
    </Link>
  );
}
