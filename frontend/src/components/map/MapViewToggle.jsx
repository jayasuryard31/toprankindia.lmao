import { useMapStore } from "./useMapStore";

export default function MapViewToggle() {
  const showHeatmap = useMapStore((s) => s.showHeatmap);
  const setShowHeatmap = useMapStore((s) => s.setShowHeatmap);

  return (
    <div className="flex items-center gap-1 p-1 rounded-2xl glass-panel shadow-feather-lg border border-border/80 select-none pointer-events-auto">
      <button
        onClick={() => setShowHeatmap(false)}
        className={`px-3 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
          !showHeatmap ? "bg-coral text-white" : "text-muted hover:text-charcoal dark:hover:text-white"
        }`}
      >
        Map View
      </button>
      <button
        onClick={() => setShowHeatmap(true)}
        className={`px-3 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
          showHeatmap ? "bg-coral text-white" : "text-muted hover:text-charcoal dark:hover:text-white"
        }`}
      >
        Heatmap
      </button>
    </div>
  );
}
