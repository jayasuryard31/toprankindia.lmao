import { Link } from "react-router-dom";
import { CategoryIcon, IconGrid, IconArrowRight } from "../common/Icons";

export default function CategorySidebar({ categories, activeId, onSelect }) {
  return (
    <div className="w-full lg:w-56 flex-shrink-0">
      {/* Container with soft glass finish */}
      <div className="glass-panel p-2.5 rounded-2xl shadow-feather border border-border/80">
        {/* All Categories Trigger */}
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left mb-1 cursor-pointer ${
            activeId === null
              ? "bg-coral/10 text-coral shadow-sm border border-coral/20"
              : "text-charcoal dark:text-cream hover:bg-surface-soft dark:hover:bg-elevated"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <IconGrid className={`w-4 h-4 ${activeId === null ? "text-coral" : "text-muted"}`} />
            <span>All Categories</span>
          </div>
        </button>

        {/* Categories List (Vertical scrollable on desktop, horizontal scroll on mobile) */}
        <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto max-h-[520px] scrollbar-hide py-0.5">
          {categories?.map((cat) => {
            const isSelected = activeId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={`flex-shrink-0 lg:flex-shrink lg:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-coral/10 text-coral font-bold shadow-sm border border-coral/20"
                    : "text-muted hover:text-charcoal dark:hover:text-cream hover:bg-surface-soft dark:hover:bg-elevated"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={isSelected ? "text-coral" : "text-muted"}>
                    <CategoryIcon idOrName={cat.id} className="w-3.5 h-3.5 flex-shrink-0" />
                  </span>
                  <span className="truncate max-w-[120px] lg:max-w-[130px]">
                    {cat.name}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                    isSelected
                      ? "bg-coral text-white font-bold"
                      : "bg-surface-soft dark:bg-elevated text-muted"
                  }`}
                >
                  {cat.productCount || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* "Browse all →" footer link to /categories */}
        <div className="pt-2 mt-1 border-t border-border/50">
          <Link
            to="/categories"
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-muted hover:text-coral hover:bg-surface-soft dark:hover:bg-elevated transition-colors"
          >
            <span>Browse all</span>
            <IconArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
