import PodiumLeaderboard from "./PodiumLeaderboard";
import { useTopProducts } from "../../hooks/useProducts";
import Skeleton from "../common/Skeleton";

export default function TopProducts() {
  const { data: products, isLoading } = useTopProducts(3);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-56 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return <PodiumLeaderboard products={products} />;
}
