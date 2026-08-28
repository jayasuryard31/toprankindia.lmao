import { useEffect, useRef, useState, useCallback } from "react";
import { ThreeCityEngine } from "./three/ThreeCityEngine";
import DistrictOverlayCards from "./three/DistrictOverlayCards";
import BrandBillboards from "./three/BrandBillboards";
import { useTheme } from "../../context/ThemeContext";
import { useMapStore } from "./useMapStore";
import InMapBuildingPopup from "../city/InMapBuildingPopup";
import PlotBidPopup from "../city/PlotBidPopup";
import BillboardBookingPopup from "../city/BillboardBookingPopup";
import { getBillboards, claimBillboard as claimBillboardApi } from "../../services/mapApi";
import EnterCityButton from "../../game/components/EnterCityButton";
import GameMode from "../../game/components/GameMode";
import PerfHUD from "../../game/components/PerfHUD";

export default function MapCanvas({
  products = [],
  activeCategoryId = null,
  focusedProduct = null,
  onSelectProduct,
  onOutbidSuccess,
  onGameModeChange,
}) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const [engineReady, setEngineReady] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [introPlaying, setIntroPlaying] = useState(false);
  // Bumped on every 3D↔2D switch to retrigger the shutter-blink overlay.
  const [blink, setBlink] = useState(0);
  const viewSwitchedRef = useRef(false);

  const [billboards, setBillboards] = useState([]);
  const [cityBillboards, setCityBillboards] = useState([]);
  const [districtCards, setDistrictCards] = useState([]);
  const [selectedTower, setSelectedTower] = useState(null);
  const [popupPos, setPopupPos] = useState(null);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [plotPos, setPlotPos] = useState(null);
  const [selectedBillboard, setSelectedBillboard] = useState(null);
  const [billboardPos, setBillboardPos] = useState(null);

  const { theme } = useTheme();
  const viewMode = useMapStore((s) => s.viewMode);
  const showHeatmap = useMapStore((s) => s.showHeatmap);

  const topBrand = products?.length
    ? [...products].sort((a, b) => (b.currentAmount || 0) - (a.currentAmount || 0))[0]?.websiteName
    : null;

  const setFps = useMapStore((s) => s.setFps);

  const updateProjectedOverlays = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (typeof engine._fps === "number") {
      setFps(Math.round(engine._fps));
    }
    const bList = engine.getProjectedTowerBillboards();
    setBillboards(bList);
    setCityBillboards(engine.getProjectedCityBillboards());
    setDistrictCards(engine.getProjectedDistrictCards());

    if (selectedTower) {
      const activeB = bList.find((b) => b.id === selectedTower.id);
      if (activeB) {
        setPopupPos({ x: activeB.screenX, y: activeB.screenY });
      } else {
        const bb = engine.brandBillboardsGroup?.children.find(
          (c) => c.userData?.product?.id === selectedTower.id
        );
        if (bb) {
          const p = engine.getProjectedPoint(bb.position.x, bb.position.z, 10);
          if (p) setPopupPos({ x: p.x, y: p.y });
        }
      }
    }
    setSelectedPlot((plot) => {
      if (plot && engine.getProjectedPoint) {
        const p = engine.getProjectedPoint(plot.worldX, plot.worldZ, 4);
        if (p) setPlotPos({ x: p.x, y: p.y });
      }
      return plot;
    });

    setSelectedBillboard((bb) => {
      if (bb && engine.getProjectedPoint) {
        const mesh = engine.brandBillboardsGroup?.children.find(
          (c) => c.userData?.billboardDef?.id === bb.billboardDef?.id
        );
        const targetPos = mesh ? mesh.position : { x: 0, z: 0 };
        const p = engine.getProjectedPoint(targetPos.x, targetPos.z, 10);
        if (p) setBillboardPos({ x: p.x, y: p.y });
      }
      return bb;
    });
  }, [selectedTower]);

  // 1. Initialize Three.js City Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new ThreeCityEngine(containerRef.current, {
      theme,
      onSelectProduct: (product, meta) => {
        setSelectedBillboard(null);
        setBillboardPos(null);
        setSelectedPlot(null);
        setPlotPos(null);
        setSelectedTower(product);
        onSelectProduct?.(product);
        updateProjectedOverlays();
        if (meta?.position) {
          const p = engine.getProjectedPoint(meta.position.x, meta.position.z, 10);
          if (p) setPopupPos({ x: p.x, y: p.y });
        }
      },
      onSelectPlot: (plot) => {
        setSelectedBillboard(null);
        setBillboardPos(null);
        setSelectedTower(null);
        setPopupPos(null);
        setSelectedPlot(plot);
        const p = engine.getProjectedPoint(plot.worldX, plot.worldZ, 4);
        if (p) setPlotPos({ x: p.x, y: p.y });
      },
      onSelectBillboard: (billboardData) => {
        setSelectedTower(null);
        setPopupPos(null);
        setSelectedPlot(null);
        setPlotPos(null);
        setSelectedBillboard(billboardData);
        const mesh = engine.brandBillboardsGroup?.children.find(
          (c) => c.userData?.billboardDef?.id === billboardData.billboardDef?.id
        );
        const targetPos = mesh ? mesh.position : { x: 0, z: 0 };
        const p = engine.getProjectedPoint(targetPos.x, targetPos.z, 10);
        if (p) setBillboardPos({ x: p.x, y: p.y });
        else setBillboardPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      },
      onProjectUpdate: updateProjectedOverlays,
    });

    engineRef.current = engine;
    window.__threeCityEngine = engine;
    setEngineReady(true);

    engine.syncProducts(products);
    updateProjectedOverlays();

    getBillboards()
      .then((res) => {
        const payload = res?.data?.data || res?.data;
        if (Array.isArray(payload)) {
          engine.setBillboardRecords(payload);
        } else if (payload && typeof payload === "object") {
          engine.claimedBillboards = { ...engine.claimedBillboards, ...payload };
          engine.syncProducts(products);
        }
      })
      .catch(() => {});

    return () => {
      engine.destroy();
      engineRef.current = null;
      window.__threeCityEngine = null;
      setEngineReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onGameModeChange?.(gameActive);
  }, [gameActive, onGameModeChange]);

  // 2. Sync Theme
  useEffect(() => {
    engineRef.current?.setTheme(theme);
  }, [theme]);

  // 2b. Sync 2D/3D view mode + heatmap overlay.
  // The engine cuts between the two views instantly (no camera tween - see
  // setViewMode). The cut is hidden behind a shutter blink, and fired at the
  // blink's peak so the swap is never visible.
  useEffect(() => {
    if (!engineReady) return undefined;
    const first = !viewSwitchedRef.current;
    viewSwitchedRef.current = true;
    if (first) {
      engineRef.current?.setViewMode?.(viewMode);
      return undefined;
    }
    setBlink((n) => n + 1);
    const id = setTimeout(() => engineRef.current?.setViewMode?.(viewMode), 95);
    return () => clearTimeout(id);
  }, [viewMode, engineReady]);

  useEffect(() => {
    engineRef.current?.setHeatmap?.(showHeatmap);
  }, [showHeatmap, engineReady]);

  // 3. Sync Products / Bids
  useEffect(() => {
    if (engineRef.current) {
      const filtered = activeCategoryId
        ? products.filter((p) => String(p.categoryId || p.category?.id) === String(activeCategoryId))
        : products;
      engineRef.current.syncProducts(filtered);
      engineRef.current.refreshHeatmap?.();
      updateProjectedOverlays();

      // Opening shot - glide in on the #1 landmark the first time this engine
      // has real data. Flag lives on the engine so a StrictMode remount (which
      // builds a fresh engine) still gets its intro. Any interaction cancels it.
      const engine = engineRef.current;
      if (!engine._introDone && filtered.length) {
        engine._introDone = true;
        engine.onIntroCancel = () => setIntroPlaying(false);
        setIntroPlaying(true);
        engine.playIntro({
          duration: 7.5,
          onDone: () => setIntroPlaying(false),
        });
      }
    }
  }, [products, activeCategoryId, updateProjectedOverlays]);

  // 4. Handle Focused Product
  useEffect(() => {
    if (focusedProduct && engineRef.current) {
      setSelectedTower(focusedProduct);
      const towerMesh = engineRef.current.brandTowersGroup.children.find(
        (c) => c.userData?.product?.id === focusedProduct.id
      );
      if (towerMesh) engineRef.current.focusTower(towerMesh);
    }
  }, [focusedProduct]);

  return (
    // No min-h-screen: the parent owns the height. Forcing 100vh here pushed
    // the bottom-anchored CTAs below the fold on phones.
    <div className="relative w-full h-full overflow-hidden select-none bg-[#f2eee9] dark:bg-[#11141a]">
      {/* touch-none: the canvas owns its gestures (orbit / pinch / joystick) */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 touch-none" />

      {/* Shutter blink covering the hard 3D↔2D cut */}
      {blink > 0 && (
        <div
          key={blink}
          className="absolute inset-0 z-[45] pointer-events-none bg-[#F2EFE9] dark:bg-[#14171C] animate-view-blink"
        />
      )}

      {/* Opening shot - subtle lower-third caption, never blocks the city */}
      {introPlaying && !gameActive && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-30 bottom-[11.75rem] md:bottom-32
                     flex flex-col items-center gap-1.5 pointer-events-none
                     animate-in fade-in slide-in-from-bottom-2 duration-700"
        >
          {topBrand && (
            <span className="px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-amber-300/40 text-[11px] font-bold text-amber-200 whitespace-nowrap max-w-[80vw] truncate">
              👑 #1 · {topBrand}
            </span>
          )}
          <button
            onClick={() => engineRef.current?.cancelIntro()}
            className="pointer-events-auto text-[9px] font-mono uppercase tracking-[0.28em]
                       text-white/60 hover:text-white transition-colors cursor-pointer
                       px-2 py-1 rounded bg-black/25 backdrop-blur-sm"
          >
            Skip
          </button>
        </div>
      )}

      {/* Enter City CTA - on mobile: on top below navigation bar; on desktop: bottom-center */}
      {!gameActive && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-40 pointer-events-auto
                     top-3 sm:top-auto sm:bottom-[4.75rem] lg:bottom-[5.25rem]"
        >
          <EnterCityButton onClick={() => setGameActive(true)} />
        </div>
      )}

      {/* Third-person in-city mode */}
      {gameActive && engineReady && (
        <GameMode
          engine={engineRef.current}
          onExit={() => setGameActive(false)}
          onOutbidSuccess={onOutbidSuccess}
        />
      )}

      {/* Map overlays - hidden while playing */}
      {!gameActive && (
        <>
      <DistrictOverlayCards
        districtCards={districtCards}
        onSelectDistrict={(distId) => engineRef.current?.focusDistrict(distId)}
      />

      <BrandBillboards
        billboards={billboards}
        cityBillboards={cityBillboards}
        onSelectProduct={(prod) => {
          setSelectedTower(prod);
          onSelectProduct?.(prod);
          const towerMesh = engineRef.current?.brandTowersGroup.children.find(
            (c) => c.userData?.product?.id === prod.id
          );
          if (towerMesh) engineRef.current?.focusTower(towerMesh);
        }}
        onSelectBillboard={(bbData) => {
          const billboardMesh = engineRef.current?.brandBillboardsGroup?.children.find(
            (c) => c.userData?.billboardDef?.id === bbData.id || c.userData?.billboardNumber === bbData.billboardNumber
          );
          if (billboardMesh) {
            engineRef.current?.focusBillboard(billboardMesh);
          } else {
            setSelectedBillboard(bbData);
            setBillboardPos({ x: bbData.screenX, y: bbData.screenY });
          }
        }}
      />

      {selectedTower && popupPos && (
        <InMapBuildingPopup
          building={{
            product: selectedTower,
            rank: selectedTower.rank || 1,
            theme: { pin: "#F05A38" },
          }}
          screenPos={popupPos}
          onClose={() => {
            setSelectedTower(null);
            setPopupPos(null);
          }}
          onOutbidSuccess={onOutbidSuccess}
        />
      )}

      {selectedPlot && plotPos && (
        <PlotBidPopup
          plot={selectedPlot}
          screenPos={plotPos}
          onClose={() => {
            setSelectedPlot(null);
            setPlotPos(null);
          }}
          onAcquire={(product, x, z) => {
            engineRef.current?.claimPlotAndRise(product, x, z);
            onOutbidSuccess?.(product);
          }}
        />
      )}

      {selectedBillboard && (
        <BillboardBookingPopup
          billboard={selectedBillboard}
          screenPos={billboardPos}
          onClose={() => {
            setSelectedBillboard(null);
            setBillboardPos(null);
          }}
          onAcquire={(billboardId, brandData) => {
            claimBillboardApi(billboardId, brandData).catch(() => {});
            engineRef.current?.claimBillboard(billboardId, brandData);
            onOutbidSuccess?.();
          }}
        />
      )}
        </>
      )}
    </div>
  );
}
