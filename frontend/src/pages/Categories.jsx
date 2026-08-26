import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { formatINR } from "../utils/formatINR";
import Skeleton from "../components/common/Skeleton";
import ErrorState from "../components/common/ErrorState";
import { CategoryIcon, IconArrowUpRight, IconGrid } from "../components/common/Icons";

export default function Categories() {
  const { data: categories, isLoading, error, refetch } = useCategories();

  // Distinct muted pastel accents for category cards
  const getCategoryAccent = (id) => {
    const accents = [
      { border: "hover:border-purple-300 dark:hover:border-purple-700", bg: "group-hover:bg-purple-50/50 dark:group-hover:bg-purple-950/20", icon: "text-purple-600 dark:text-purple-400" },
      { border: "hover:border-blue-300 dark:hover:border-blue-700", bg: "group-hover:bg-blue-50/50 dark:group-hover:bg-blue-950/20", icon: "text-blue-600 dark:text-blue-400" },
      { border: "hover:border-orange-300 dark:hover:border-orange-700", bg: "group-hover:bg-orange-50/50 dark:group-hover:bg-orange-950/20", icon: "text-coral" },
      { border: "hover:border-rose-300 dark:hover:border-rose-700", bg: "group-hover:bg-rose-50/50 dark:group-hover:bg-rose-950/20", icon: "text-rose-600 dark:text-rose-400" },
      { border: "hover:border-fuchsia-300 dark:hover:border-fuchsia-700", bg: "group-hover:bg-fuchsia-50/50 dark:group-hover:bg-fuchsia-950/20", icon: "text-fuchsia-600 dark:text-fuchsia-400" },
      { border: "hover:border-amber-300 dark:hover:border-amber-700", bg: "group-hover:bg-amber-50/50 dark:group-hover:bg-amber-950/20", icon: "text-amber-600 dark:text-amber-400" },
      { border: "hover:border-indigo-300 dark:hover:border-indigo-700", bg: "group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-950/20", icon: "text-indigo-600 dark:text-indigo-400" },
      { border: "hover:border-emerald-300 dark:hover:border-emerald-700", bg: "group-hover:bg-emerald-50/50 dark:group-hover:bg-emerald-950/20", icon: "text-emerald-600 dark:text-emerald-400" },
      { border: "hover:border-teal-300 dark:hover:border-teal-700", bg: "group-hover:bg-teal-50/50 dark:group-hover:bg-teal-950/20", icon: "text-teal-600 dark:text-teal-400" },
      { border: "hover:border-sky-300 dark:hover:border-sky-700", bg: "group-hover:bg-sky-50/50 dark:group-hover:bg-sky-950/20", icon: "text-sky-600 dark:text-sky-400" },
      { border: "hover:border-green-300 dark:hover:border-green-700", bg: "group-hover:bg-green-50/50 dark:group-hover:bg-green-950/20", icon: "text-green-600 dark:text-green-400" },
      { border: "hover:border-pink-300 dark:hover:border-pink-700", bg: "group-hover:bg-pink-50/50 dark:group-hover:bg-pink-950/20", icon: "text-pink-600 dark:text-pink-400" },
      { border: "hover:border-violet-300 dark:hover:border-violet-700", bg: "group-hover:bg-violet-50/50 dark:group-hover:bg-violet-950/20", icon: "text-violet-600 dark:text-violet-400" },
      { border: "hover:border-cyan-300 dark:hover:border-cyan-700", bg: "group-hover:bg-cyan-50/50 dark:group-hover:bg-cyan-950/20", icon: "text-cyan-600 dark:text-cyan-400" },
      { border: "hover:border-stone-300 dark:hover:border-stone-700", bg: "group-hover:bg-stone-50/50 dark:group-hover:bg-stone-950/20", icon: "text-stone-600 dark:text-stone-400" },
    ];
    return accents[(id - 1) % accents.length] || accents[0];
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <ErrorState message="Failed to load categories." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 ambient-bg">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-coral uppercase tracking-widest mb-1.5">
          <IconGrid className="w-3.5 h-3.5" />
          <span>Category Explorer</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal dark:text-white tracking-tight">
          Explore Product Arenas
        </h1>
        <p className="text-sm text-muted mt-2 max-w-lg">
          Discover products competing for the top spot across all 15 industry sectors.
        </p>
      </div>

      {/* Editorial Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories?.map((cat) => {
          const accent = getCategoryAccent(cat.id);
          const formattedIndex = cat.id < 10 ? `0${cat.id}` : `${cat.id}`;
          return (
            <Link
              key={cat.id}
              to={`/categories/${cat.id}`}
              className={`group relative p-6 rounded-3xl card-soft shadow-feather hover:shadow-feather-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between ${accent.border} ${accent.bg}`}
            >
              <div>
                {/* Top Row: Index & Category Icon */}
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-muted/60 tracking-wider">
                    {formattedIndex}
                  </span>
                  <div className={`p-2 rounded-xl bg-surface-soft dark:bg-elevated ${accent.icon}`}>
                    <CategoryIcon idOrName={cat.id} className="w-4 h-4" />
                  </div>
                </div>

                {/* Category Name */}
                <h2 className="font-bold text-base text-charcoal dark:text-white group-hover:text-coral transition-colors mb-2">
                  {cat.name}
                </h2>

                <p className="text-xs text-muted">
                  {cat.productCount || 0} {(cat.productCount === 1) ? "product" : "products"} listed
                </p>
              </div>

              {/* Bottom Row: Highest Spend & Arrow CTA */}
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-light block">
                    Top Spend
                  </span>
                  <span className="font-mono text-sm font-black text-charcoal dark:text-white">
                    {cat.highestAmount > 0 ? formatINR(cat.highestAmount) : "₹0"}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-xl bg-surface-soft dark:bg-elevated flex items-center justify-center text-muted group-hover:text-coral group-hover:bg-coral/10 transition-colors">
                  <IconArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
