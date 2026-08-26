import { useParams, Link } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";
import { useCategories } from "../hooks/useCategories";
import { formatINR } from "../utils/formatINR";
import ProductCard from "../components/home/ProductCard";
import PodiumLeaderboard from "../components/home/PodiumLeaderboard";
import Skeleton from "../components/common/Skeleton";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";
import { CategoryIcon, IconSparkle } from "../components/common/Icons";

export default function CategoryDetails() {
  const { categoryId } = useParams();
  const { data: categories } = useCategories();
  const category = categories?.find((c) => c.id === Number(categoryId));

  const { data, isLoading, error, refetch } = useProducts({
    categoryId: Number(categoryId),
    limit: 50,
    sort: "rank",
  });

  const productsList = data?.data || [];
  const topThree = productsList.slice(0, 3);
  const remainingProducts = productsList.slice(3);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-32 rounded-3xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <ErrorState message="Failed to load category products." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 ambient-bg">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted mb-6">
        <Link to="/categories" className="hover:text-coral transition-colors font-medium">
          Categories
        </Link>
        <span>/</span>
        <span className="text-charcoal dark:text-cream font-medium">
          {category?.name || "Category"}
        </span>
      </div>

      {/* Category Hero Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-feather-lg border border-border/80 mb-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-coral/10 text-coral border border-coral/20 flex-shrink-0">
              <CategoryIcon idOrName={categoryId} className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal dark:text-white tracking-tight">
                {category?.name || "Category Leaderboard"}
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-1">
                {category?.productCount || productsList.length} products competing in this space
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-soft dark:bg-elevated border border-border/60 text-right sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              Top Category Spend
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-coral">
              {category?.highestAmount ? formatINR(category.highestAmount) : "₹0"}
            </span>
          </div>
        </div>
      </div>

      {/* Products Display */}
      {productsList.length > 0 ? (
        <div className="space-y-6">
          {/* Top 3 Podium if at least 2 products */}
          {topThree.length >= 2 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted mb-2 px-1">
                <IconSparkle className="w-3.5 h-3.5 text-amber-500" />
                <span>Top Category Spots</span>
              </div>
              <PodiumLeaderboard products={topThree} />
            </div>
          )}

          {/* Stream of Products */}
          <div>
            {topThree.length >= 2 && remainingProducts.length > 0 && (
              <div className="flex items-center gap-3 my-4">
                <div className="h-px bg-border/80 flex-1" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-light">
                  Ranked Stream
                </span>
                <div className="h-px bg-border/80 flex-1" />
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {(topThree.length >= 2 ? remainingProducts : productsList).map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  index={topThree.length >= 2 ? i + 3 : i}
                  overallRank={topThree.length >= 2 ? i + 4 : i + 1}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No products here yet."
          message={`Be the first product founder to take the #1 spot in ${category?.name || "this category"}.`}
        />
      )}
    </div>
  );
}
