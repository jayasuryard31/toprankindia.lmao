import LogoFallback from "../../common/LogoFallback";

/**
 * 3D Floating Brand Billboard Cards & City Billboard Trackers:
 * - Fixed anchor containers prevent pointer thrashing and hover glitching
 * - Smooth CSS transitions applied strictly to visual inner elements
 * - Interactive digital badges for City & Times Square billboards (#1 – #24)
 */
export default function BrandBillboards({
  billboards = [],
  cityBillboards = [],
  onSelectProduct,
  onSelectBillboard,
}) {
  const compact =
    typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches;
  const scale = compact ? 0.72 : 1;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {/* 1. Skyscraper Tower Rooftop Brand Cards */}
      {billboards.map((b) => {
        const isTop1 = b.rank === 1;

        return (
          <div
            key={b.id}
            style={{
              left: `${b.screenX}px`,
              top: `${b.screenY}px`,
              transform: `translate(-50%, -100%) scale(${scale})`,
              transformOrigin: "bottom center",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectProduct?.(b.product);
            }}
            className="absolute pointer-events-auto cursor-pointer select-none group z-10 hover:z-30"
          >
            <div className="flex flex-col items-center transition-transform duration-150 ease-out group-hover:scale-105 will-change-transform">
              {/* Top 1 Crown */}
              {isTop1 && (
                <div className="text-xl filter drop-shadow-md -mb-1 animate-bounce">
                  👑
                </div>
              )}

              {/* Main Brand Billboard Card */}
              <div
                className="relative flex items-center justify-center px-3 py-1.5 rounded-2xl bg-white text-slate-900 shadow-2xl border-2 transition-all group-hover:shadow-coral/40"
                style={{
                  borderColor: b.color || "#F05A38",
                  minWidth: isTop1 ? "110px" : "88px",
                  height: isTop1 ? "50px" : "44px",
                }}
              >
                <div className="flex items-center justify-center w-full h-full max-h-[34px] overflow-hidden">
                  <LogoFallback
                    src={b.product?.logoUrl || b.product?.faviconUrl}
                    name={b.product?.websiteName || "Brand"}
                    size={isTop1 ? 34 : 28}
                  />
                </div>

                {/* Rank Badge (#1, #2, ...) */}
                <span
                  className="absolute -top-2.5 -right-2.5 px-2 py-0.5 rounded-full font-mono font-black text-[10px] text-white shadow-md border border-white flex items-center justify-center"
                  style={{ backgroundColor: isTop1 ? "#F59E0B" : b.color || "#F05A38" }}
                >
                  #{b.rank}
                </span>
              </div>

              {/* Downward Anchor Stem to 3D Rooftop */}
              <div
                className="w-0.5 h-3 shadow-sm"
                style={{ backgroundColor: b.color || "#F05A38" }}
              />
            </div>
          </div>
        );
      })}

      {/* 2. City-Wide & Times Square Bookable Billboard Markers */}
      {cityBillboards.map((cb) => {
        const isOccupied = cb.isOccupied;
        const color = isOccupied ? "#10b981" : "#0ea5e9";

        return (
          <div
            key={cb.id}
            style={{
              left: `${cb.screenX}px`,
              top: `${cb.screenY}px`,
              transform: `translate(-50%, -100%) scale(${scale * 0.88})`,
              transformOrigin: "bottom center",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBillboard?.(cb);
            }}
            className="absolute pointer-events-auto cursor-pointer select-none group z-10 hover:z-30"
            title={`${cb.name} · ${cb.fixedCost}`}
          >
            <div className="flex flex-col items-center transition-transform duration-150 ease-out group-hover:scale-105 will-change-transform">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg border backdrop-blur-md text-[11px] font-bold whitespace-nowrap bg-slate-900/95 text-white transition-all group-hover:bg-slate-800"
                style={{
                  borderColor: color,
                  boxShadow: `0 0 12px ${color}45`,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-mono font-black text-amber-300">#{cb.billboardNumber}</span>
                <span className="text-slate-200 font-medium">
                  {isOccupied ? (cb.brand || "Sponsor") : (cb.fixedCost || "$20/mo")}
                </span>
                <span className="text-[10px] text-sky-400">
                  {isOccupied ? "↗" : "⚡"}
                </span>
              </div>

              {/* Pointer stem */}
              <div
                className="w-0.5 h-2"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
