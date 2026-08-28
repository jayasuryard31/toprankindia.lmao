import { useEffect, useState } from "react";
import CityMiniMap from "./CityMiniMap";

/**
 * Overview panel on the map view. Renders from the SAME cityGrid + live engine
 * the 3D world uses, so it is always in sync (the old MapLibre version drew a
 * completely separate fake lng/lat city and could never match).
 */
export default function MiniMap() {
  // The engine is created by MapCanvas, which may mount after this panel -
  // poll briefly so the overview never gets stuck on a null reference.
  const [engine, setEngine] = useState(() =>
    typeof window !== "undefined" ? window.__threeCityEngine : null
  );
  useEffect(() => {
    if (engine) return undefined;
    const id = setInterval(() => {
      if (window.__threeCityEngine) {
        setEngine(window.__threeCityEngine);
        clearInterval(id);
      }
    }, 300);
    return () => clearInterval(id);
  }, [engine]);

  return (
    <div className="glass-panel rounded-2xl border border-border/80 shadow-feather-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">Overview</span>
        <span className="text-[9px] font-mono text-muted/70">Velora Harbor</span>
      </div>
      <div className="px-2.5 pb-2.5">
        <CityMiniMap engine={engine} size={268} showPlots showViewport />
      </div>
      <div className="px-3 pb-2.5 flex items-center gap-3 text-[9px] text-muted font-mono">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#ffd54a]" /> #1
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[rgba(226,232,240,0.8)]" /> Built
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm border border-[#7dffb0]" /> Free plot
        </span>
      </div>
    </div>
  );
}
