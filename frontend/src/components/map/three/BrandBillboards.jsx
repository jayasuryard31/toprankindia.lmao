import LogoFallback from "../../common/LogoFallback";

/**
 * 3D Floating Brand Billboard Cards matching the reference image:
 * - Rounded white card with high-contrast brand logo
 * - Rank badge in top right (#1, #2...)
 * - Golden crown 👑 for #1 spot
 * - Clean anchor stem to skyscraper roof
 */
export default function BrandBillboards({ billboards = [], onSelectProduct }) {
  // Phones get compact cards so the skyline stays readable.
  const compact =
    typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches;
  const scale = compact ? 0.68 : 1;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {billboards.map((b) => {
        const isTop1 = b.rank === 1;

        return (
          <div
            key={b.id}
            style={{
              transform: `translate3d(${b.screenX}px, ${b.screenY}px, 0px) translate(-50%, -100%) scale(${scale})`,
              transformOrigin: "bottom center",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectProduct?.(b.product);
            }}
            className="absolute pointer-events-auto cursor-pointer transition-transform duration-200 hover:scale-110 select-none group"
          >
            {/* Top 1 Crown */}
            {isTop1 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl filter drop-shadow-md animate-bounce">
                👑
              </div>
            )}

            {/* Main Brand Billboard Card */}
            <div
              className="relative flex items-center justify-center px-3 py-2 rounded-2xl bg-white text-slate-900 shadow-2xl border-2 transition-all"
              style={{
                borderColor: b.color || "#F05A38",
                minWidth: isTop1 ? "115px" : "90px",
                height: isTop1 ? "54px" : "46px",
              }}
            >
              {/* Brand Logo / Image from index.html */}
              <div className="flex items-center justify-center w-full h-full max-h-[38px] overflow-hidden">
                <LogoFallback
                  src={b.product?.logoUrl || b.product?.faviconUrl}
                  name={b.product?.websiteName || "Brand"}
                  size={isTop1 ? 38 : 32}
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
              className="w-0.5 h-3 mx-auto shadow-sm"
              style={{ backgroundColor: b.color || "#F05A38" }}
            />
          </div>
        );
      })}
    </div>
  );
}
