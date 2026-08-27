import { formatINR } from "../../../utils/formatINR";

/**
 * 3D Floating District Info Cards (as seen in the mockup):
 * Displays district name, total value, and building count pinned in 3D world space.
 */
export default function DistrictOverlayCards({ districtCards = [], onSelectDistrict }) {
  const compact =
    typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches;
  const scale = compact ? 0.7 : 1;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {districtCards.map((d) => {
        if (!d.isVisible) return null;

        return (
          <div
            key={d.id}
            style={{
              transform: `translate3d(${d.screenX}px, ${d.screenY}px, 0px) translate(-50%, -50%) scale(${scale})`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectDistrict?.(d.id);
            }}
            className="absolute pointer-events-auto cursor-pointer select-none transition-transform hover:scale-105"
          >
            <div className="px-3 py-2 rounded-2xl bg-white/90 dark:bg-[#1E1B18]/90 backdrop-blur-md border border-border/80 shadow-lg text-left">
              <h4
                className="font-black text-xs tracking-wider uppercase"
                style={{ color: d.accent || d.color }}
              >
                {d.name}
              </h4>
              <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                <span>Total Value:</span>
                <span className="font-mono font-bold text-coral dark:text-coral-light">
                  {formatINR(d.totalValue)}
                </span>
              </div>
              <span className="text-[9px] text-muted-light block">
                {d.buildingsCount} Buildings
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
