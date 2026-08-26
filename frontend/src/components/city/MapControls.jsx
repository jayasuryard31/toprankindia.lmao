export default function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onCenterTopSpot,
  viewMode = "2D",
  onToggleViewMode,
}) {
  return (
    <div className="absolute bottom-6 left-4 md:left-6 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel shadow-feather-lg border border-border/80 select-none">
      <button
        onClick={onZoomOut}
        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base text-muted hover:text-charcoal dark:hover:text-white bg-surface dark:bg-surface hover:bg-surface-soft dark:hover:bg-elevated transition-colors shadow-sm cursor-pointer"
        title="Zoom Out"
      >
        −
      </button>

      <button
        onClick={onReset}
        className="px-2.5 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold text-muted hover:text-charcoal dark:hover:text-white bg-surface dark:bg-surface hover:bg-surface-soft dark:hover:bg-elevated transition-colors shadow-sm cursor-pointer"
        title="Reset Zoom"
      >
        100%
      </button>

      <button
        onClick={onZoomIn}
        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base text-muted hover:text-charcoal dark:hover:text-white bg-surface dark:bg-surface hover:bg-surface-soft dark:hover:bg-elevated transition-colors shadow-sm cursor-pointer"
        title="Zoom In"
      >
        +
      </button>

      <div className="h-4 w-px bg-border/80 mx-0.5" />

      {/* 2D / 3D Mode Switcher */}
      <button
        onClick={onToggleViewMode}
        className="px-2.5 h-8 rounded-xl flex items-center justify-center text-xs font-bold bg-coral/10 text-coral hover:bg-coral/20 transition-all cursor-pointer"
        title="Toggle between 2D Top View & 3D Isometric View"
      >
        <span>{viewMode === "2D" ? "3D Isometric" : "2D Top View"}</span>
      </button>

      <div className="h-4 w-px bg-border/80 mx-0.5" />

      <button
        onClick={onCenterTopSpot}
        className="px-2.5 h-8 rounded-xl flex items-center justify-center text-xs font-semibold text-coral hover:bg-coral/10 transition-colors cursor-pointer whitespace-nowrap"
        title="Center on #1 Top Spot"
      >
        Center #1
      </button>
    </div>
  );
}
