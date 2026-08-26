import { useState, useMemo } from "react";
import { useHome } from "../hooks/useHome";
import { useProducts } from "../hooks/useProducts";
import { useCategories } from "../hooks/useCategories";
import CityCanvas from "../components/city/CityCanvas";
import BuildingPreview from "../components/city/BuildingPreview";
import MapControls from "../components/city/MapControls";
import BidBar from "../components/panels/BidBar";
import LeftSidebar from "../components/panels/LeftSidebar";
import RightSidebar from "../components/panels/RightSidebar";
import BottomStatsBar from "../components/panels/BottomStatsBar";
import MobileNav from "../components/layout/MobileNav";
import CommandSearch from "../components/common/CommandSearch";
import ErrorState from "../components/common/ErrorState";

export default function Home() {
  const { data: homeData, error: homeError, refetch: refetchHome } = useHome();
  const { data: categories } = useCategories();

  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [focusedBuildingId, setFocusedBuildingId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState("2D");
  const [mobileBidOpen, setMobileBidOpen] = useState(false);

  // Fetch all ranked products to populate city buildings
  const {
    data: productsData,
    error: productsError,
    refetch: refetchProducts,
  } = useProducts({
    limit: 100,
    sort: "rank",
    period: "all",
  });

  const allProducts = useMemo(() => {
    return productsData?.data || homeData?.topProducts || [];
  }, [productsData, homeData]);

  const topProducts = useMemo(() => {
    return allProducts.slice(0, 5);
  }, [allProducts]);

  const recentActivity = useMemo(() => {
    return homeData?.recentActivity || [];
  }, [homeData]);

  // Center on Top #1 building
  const handleFocusTopSpot = () => {
    if (allProducts.length > 0) {
      const top1 = allProducts[0];
      setFocusedBuildingId(top1.id);
      setSelectedProduct(top1);
    }
  };

  // Toggle between 2D Top-Down and 3D Isometric View
  const handleToggleViewMode = () => {
    setViewMode((prev) => (prev === "2D" ? "3D" : "2D"));
  };

  // When payment succeeds, refresh and fly to the new building
  const handlePaymentSuccess = (product) => {
    refetchHome();
    refetchProducts();
    setMobileBidOpen(false);
    if (product) {
      setFocusedBuildingId(product.id);
      setSelectedProduct(product);
    }
  };

  if (homeError && productsError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <ErrorState
          message="Failed to connect to TopRankIndia City. Please check your connection."
          onRetry={() => {
            refetchHome();
            refetchProducts();
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-68px)] min-h-[640px] overflow-hidden flex flex-col bg-[#F7F5F0] dark:bg-[#110F0D]">
      {/* 1. Top Floating Bid Bar (Hidden on small mobile screens, replaced by floating bottom CTA) */}
      <div className="absolute top-3 left-0 right-0 z-30 pointer-events-none hidden sm:block">
        <div className="pointer-events-auto max-w-3xl mx-auto">
          <BidBar onPaymentSuccess={handlePaymentSuccess} />
        </div>
      </div>

      {/* 2. Main Interactive Endless City & Ocean Canvas */}
      <div className="relative w-full h-full flex-1">
        <CityCanvas
          products={allProducts}
          activeCategoryId={activeCategoryId}
          selectedProduct={selectedProduct}
          onSelectBuilding={(p) => setSelectedProduct(p)}
          focusedBuildingId={focusedBuildingId}
          onClearFocus={() => setFocusedBuildingId(null)}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
        />

        {/* 3. Floating Left Sidebar (Metropolis Stats, District Filters & Live Activity) */}
        <div className="absolute top-20 left-4 md:left-6 z-20 hidden md:block pointer-events-none">
          <div className="pointer-events-auto">
            <LeftSidebar
              categories={categories}
              activeCategoryId={activeCategoryId}
              onSelectCategory={(id) => setActiveCategoryId(id)}
              onFocusTopSpot={handleFocusTopSpot}
              onOpenSearch={() => setSearchOpen(true)}
              recentActivity={recentActivity}
            />
          </div>
        </div>

        {/* 4. Floating Right Sidebar (Live Feed, Top Empires & How It Works) */}
        <div className="absolute top-20 right-4 md:right-6 z-20 hidden lg:block pointer-events-none">
          <div className="pointer-events-auto">
            <RightSidebar
              topProducts={topProducts}
              recentActivity={recentActivity}
              onSelectProduct={(p) => {
                setSelectedProduct(p);
                setFocusedBuildingId(p.id);
              }}
            />
          </div>
        </div>

        {/* 5. Floating Selected Building Details Preview */}
        {selectedProduct && (
          <BuildingPreview
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onOutbidSuccess={handlePaymentSuccess}
          />
        )}

        {/* 6. Bottom Floating Status Metrics (Hidden on Mobile) */}
        <div className="hidden sm:block">
          <BottomStatsBar />
        </div>

        {/* 7. Bottom Left Floating Map Controls with 2D/3D Switcher */}
        <MapControls
          onZoomIn={() => {
            const canvas = document.querySelector("canvas");
            if (canvas) {
              const event = new WheelEvent("wheel", { deltaY: -100 });
              canvas.dispatchEvent(event);
            }
          }}
          onZoomOut={() => {
            const canvas = document.querySelector("canvas");
            if (canvas) {
              const event = new WheelEvent("wheel", { deltaY: 100 });
              canvas.dispatchEvent(event);
            }
          }}
          onReset={handleFocusTopSpot}
          onCenterTopSpot={handleFocusTopSpot}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
        />
      </div>

      {/* 8. Mobile Navigation Tab Bar & Bottom CTA */}
      <MobileNav onOpenBidModal={() => setMobileBidOpen(true)} />

      {/* 9. Mobile Bid Modal Overlay */}
      {mobileBidOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:hidden animate-in fade-in duration-150">
          <div className="w-full max-w-sm glass-panel p-4 rounded-3xl border border-border shadow-feather-xl relative">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-xs uppercase tracking-wider text-charcoal dark:text-cream">
                Build Your Spot
              </span>
              <button
                onClick={() => setMobileBidOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-soft dark:bg-elevated flex items-center justify-center text-muted font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <BidBar onPaymentSuccess={handlePaymentSuccess} />
          </div>
        </div>
      )}

      {/* 10. Global Command Search Modal */}
      <CommandSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(p) => {
          setSelectedProduct(p);
          setFocusedBuildingId(p.id);
          setSearchOpen(false);
        }}
      />
    </div>
  );
}
