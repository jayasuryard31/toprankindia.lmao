import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useHome } from "../hooks/useHome";
import { useProducts } from "../hooks/useProducts";
import { useCategories } from "../hooks/useCategories";
import MapControls from "../components/map/MapControls";
import MapViewToggle from "../components/map/MapViewToggle";
import PanelToggles from "../components/map/PanelToggles";
import CurrencySelector from "../components/map/CurrencySelector";
import FpsBadge from "../components/map/FpsBadge";
import { useMapStore } from "../components/map/useMapStore";
import BidBar from "../components/panels/BidBar";
import LeftSidebar from "../components/panels/LeftSidebar";
import RightSidebar from "../components/panels/RightSidebar";
import BottomStatsBar from "../components/panels/BottomStatsBar";
import MobileNav from "../components/layout/MobileNav";
import CommandSearch from "../components/common/CommandSearch";
import ErrorState from "../components/common/ErrorState";

// The 3D city (three.js + engine + in-city game layer) is a large chunk - load
// it after the page shell so the dashboard/nav/panels paint immediately.
const MapCanvas = lazy(() => import("../components/map/MapCanvas"));
// MiniMap now renders from cityGrid on a canvas (no maplibre); still lazy so
// it only mounts when the overview panel is shown.
const MiniMap = lazy(() => import("../components/map/MiniMap"));

function MapLoading() {
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center bg-[#F1EEE6] dark:bg-[#14171C]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 rounded-full border-2 border-coral/30 border-t-coral animate-spin" />
        <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted">
          Building Velora Harbor
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: homeData, error: homeError, refetch: refetchHome } = useHome();
  const { data: categories } = useCategories();

  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileBidOpen, setMobileBidOpen] = useState(false);
  const [gameActive, setGameActive] = useState(false);

  const panels = useMapStore((s) => s.panels);
  const setInCity = useMapStore((s) => s.setInCity);

  // Publish "player is inside the city" globally so the site header can get out
  // of the way; always clear it when this page unmounts.
  useEffect(() => {
    setInCity(gameActive);
  }, [gameActive, setInCity]);
  useEffect(() => () => setInCity(false), [setInCity]);

  const {
    data: productsData,
    error: productsError,
    refetch: refetchProducts,
  } = useProducts({ limit: 100, sort: "rank", period: "all" });

  const allProducts = useMemo(
    () => productsData?.data || homeData?.topProducts || [],
    [productsData, homeData]
  );
  const topProducts = useMemo(() => allProducts.slice(0, 5), [allProducts]);
  const recentActivity = useMemo(() => homeData?.recentActivity || [], [homeData]);

  const handleFocusTopSpot = () => {
    if (allProducts.length > 0) setSelectedProduct({ ...allProducts[0] });
  };

  const handlePaymentSuccess = (product) => {
    refetchHome();
    refetchProducts();
    setMobileBidOpen(false);
    if (product) setSelectedProduct({ ...product });
  };

  if (homeError && productsError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <ErrorState
          message="Failed to connect to Velora Harbor. Please check your connection."
          onRetry={() => {
            refetchHome();
            refetchProducts();
          }}
        />
      </div>
    );
  }

  const rightRailVisible =
    panels.overview || panels.liveFeed || panels.topEmpires;

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#F1EEE6] dark:bg-[#14171C] ${
        gameActive ? "h-screen" : "h-[calc(100vh-56px)] min-h-[560px]"
      }`}
    >
      {/* ── Map canvas - the dominant surface ───────────────────────── */}
      <Suspense fallback={<MapLoading />}>
        <MapCanvas
          products={allProducts}
          activeCategoryId={activeCategoryId}
          focusedProduct={selectedProduct}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onOutbidSuccess={handlePaymentSuccess}
          onGameModeChange={setGameActive}
        />
      </Suspense>

      {/* Map UI hides entirely while the player is inside the city */}
      {gameActive ? null : (
      <>
      {/* ── Top row: view toggle · bid bar · panel toggles ──────────── */}
      <div className="absolute top-4 left-4 z-30 hidden md:block">
        <MapViewToggle />
      </div>

      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 hidden sm:block pointer-events-none">
        <div className="pointer-events-auto">
          <BidBar onPaymentSuccess={handlePaymentSuccess} />
        </div>
      </div>

      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <FpsBadge />
        <CurrencySelector />
        <div className="hidden md:block">
          <PanelToggles />
        </div>
      </div>

      {/* ── Left rail: City Districts ───────────────────────────────── */}
      {panels.districts && (
        <div className="absolute left-4 top-[4.75rem] bottom-32 z-20 hidden lg:flex flex-col w-72 overflow-y-auto scrollbar-hide pointer-events-none">
          <div className="pointer-events-auto">
            <LeftSidebar
              categories={categories}
              activeCategoryId={activeCategoryId}
              onSelectCategory={(id) => setActiveCategoryId(id)}
              onFocusTopSpot={handleFocusTopSpot}
              onOpenSearch={() => setSearchOpen(true)}
            />
          </div>
        </div>
      )}

      {/* ── Right rail: overview · live feed · top empires ── */}
      {rightRailVisible && (
        <div className="absolute right-4 top-[4.75rem] bottom-32 z-20 hidden lg:flex flex-col w-[19.5rem] overflow-y-auto scrollbar-hide pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-3">
            {panels.overview && (
              <Suspense fallback={<div className="h-[168px] rounded-2xl bg-surface-soft/60 dark:bg-elevated/60 animate-pulse" />}>
                <MiniMap />
              </Suspense>
            )}
            <RightSidebar
              topProducts={topProducts}
              recentActivity={recentActivity}
              showLiveFeed={panels.liveFeed}
              showTopEmpires={panels.topEmpires}
              onSelectProduct={(p) => setSelectedProduct({ ...p })}
            />
          </div>
        </div>
      )}

      {/* ── Bottom-left: map controls ──────────────────────────────── */}
      <div className="absolute bottom-5 left-4 z-20 hidden md:block">
        <MapControls />
      </div>

      {/* ── Bottom-center: stats ──────────────────────────────────── */}
      {panels.stats && (
        <div className="hidden lg:block">
          <BottomStatsBar />
        </div>
      )}

      {/* ── Mobile ────────────────────────────────────────────────── */}
      <MobileNav onOpenBidModal={() => setMobileBidOpen(true)} />

      {mobileBidOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:hidden">
          <div className="w-full max-w-sm glass-panel p-4 rounded-3xl border border-border shadow-feather-lg relative">
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

      <CommandSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(p) => {
          setSelectedProduct({ ...p });
          setSearchOpen(false);
        }}
      />
      </>
      )}
    </div>
  );
}
