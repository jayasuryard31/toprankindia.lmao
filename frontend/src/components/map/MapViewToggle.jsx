import { useMapStore } from "./useMapStore";

/**
 * Two independent switches that share one control strip:
 *   • 3D / 2D    - isometric city  vs  top-down Google-Maps plan
 *   • Map / Heat - plain city      vs  bid-value heat overlay
 */
export default function MapViewToggle() {
  const showHeatmap = useMapStore((s) => s.showHeatmap);
  const setShowHeatmap = useMapStore((s) => s.setShowHeatmap);
  const viewMode = useMapStore((s) => s.viewMode);
  const setViewMode = useMapStore((s) => s.setViewMode);

  const pill = (active) =>
    `px-3 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
      active ? "bg-coral text-white shadow-sm" : "text-muted hover:text-charcoal dark:hover:text-white"
    }`;

  return (
    <div className="flex flex-col gap-2 select-none pointer-events-auto">
      {/* dimension */}
      <div className="flex items-center gap-1 p-1 rounded-2xl glass-panel shadow-feather-lg border border-border/80">
        <button onClick={() => setViewMode("3D")} className={pill(viewMode === "3D")} title="Isometric city view">
          3D City
        </button>
        <button onClick={() => setViewMode("2D")} className={pill(viewMode === "2D")} title="Top-down map view">
          2D Map
        </button>
      </div>

      {/* overlay */}
      <div className="flex items-center gap-1 p-1 rounded-2xl glass-panel shadow-feather-lg border border-border/80">
        <button onClick={() => setShowHeatmap(false)} className={pill(!showHeatmap)}>
          Map View
        </button>
        <button
          onClick={() => setShowHeatmap(true)}
          className={`${pill(showHeatmap)} flex items-center gap-1.5`}
          title="Colour the city by bid value"
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "linear-gradient(90deg,#2b57d6,#ffb020,#ff3b2f)" }}
          />
          Heatmap
        </button>
      </div>
    </div>
  );
}
