import { Link } from "react-router-dom";
import { formatINR } from "../../utils/formatINR";
import LogoFallback from "../../components/common/LogoFallback";
import { IconX, IconSparkle, IconArrowUpRight } from "../../components/common/Icons";

/**
 * In-world info panel for a brand building or a city billboard.
 *
 * This is deliberately NOT a full-screen modal - it is a compact card pinned
 * beside the player's head in screen space, so reading it never takes you out
 * of the world. `anchor` is {x, y, visible} from engine.getProjectedPoint().
 */
export default function LandmarkPrompt({ landmark, anchor, onClose }) {
  if (!landmark) return null;

  const p = landmark.product || {};
  const isBillboard = landmark.type === "billboard";
  const brandName = landmark.brand || p.websiteName || "Featured Brand";
  const claimed = Boolean(p.isClaimed || p.isBought || landmark.isOccupied);
  const categoryName = p.categoryName || p.category?.name || (isBillboard ? "Ad Space" : "Corporate Partner");
  const description =
    p.tagline || p.description ||
    (isBillboard && !claimed
      ? "This screen is open for sponsorship. Book it to run your brand across the city skyline."
      : "Official brand showcase on TopRankWorld.lol");
  const color = landmark.color || "#F05A38";

  // Pin beside the head; clamp so the card never leaves the viewport.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 720;
  const CARD_W = 320;
  const ax = anchor?.x ?? vw / 2;
  const ay = anchor?.y ?? vh / 2;
  // prefer the side with more room
  const toRight = ax < vw / 2;
  let left = toRight ? ax + 34 : ax - 34 - CARD_W;
  left = Math.min(Math.max(12, left), vw - CARD_W - 12);
  const top = Math.min(Math.max(70, ay - 150), vh - 300);

  return (
    <>
      {/* click-away catcher - transparent, keeps the world visible */}
      <div className="absolute inset-0 z-40 pointer-events-auto" onClick={onClose} />

      {/* leader line from the player's head to the card */}
      {anchor?.visible && (
        <svg className="absolute inset-0 z-40 pointer-events-none" width="100%" height="100%">
          <line
            x1={ax}
            y1={ay}
            x2={toRight ? left : left + CARD_W}
            y2={top + 46}
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.7"
          />
          <circle cx={ax} cy={ay} r="4" fill={color} opacity="0.9" />
        </svg>
      )}

      <div
        className="absolute z-50 pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
        style={{ left, top, width: CARD_W }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-2xl border-2 shadow-2xl overflow-hidden bg-surface/95 dark:bg-[#15181d]/95 backdrop-blur-xl"
          style={{ borderColor: color }}
        >
          <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

          <div className="p-3.5">
            {/* header */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase flex items-center gap-1"
                style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                {isBillboard
                  ? claimed ? "Sponsored Screen" : "Ad Space Available"
                  : "Brand Headquarters"}
              </span>
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-charcoal dark:hover:text-white bg-surface-soft dark:bg-elevated transition-colors cursor-pointer flex-shrink-0"
                title="Close"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* brand identity */}
            <div className="flex items-start gap-2.5 mb-2.5">
              <div
                className="w-11 h-11 rounded-xl overflow-hidden bg-surface-soft dark:bg-elevated flex items-center justify-center border flex-shrink-0"
                style={{ borderColor: `${color}44` }}
              >
                <LogoFallback src={p.logoUrl || p.faviconUrl} name={brandName} size={44} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-sm text-charcoal dark:text-cream truncate leading-tight">
                  {brandName}
                </h3>
                <div className="text-[10px] font-mono text-muted mt-0.5 truncate">
                  {isBillboard ? landmark.billboardName : `${categoryName} · ${landmark.district}`}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-charcoal/75 dark:text-cream/75 leading-snug mb-2.5 line-clamp-3">
              {description}
            </p>

            {/* stats */}
            <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-surface-soft/80 dark:bg-elevated/80 border border-border/60 text-center mb-3">
              {isBillboard ? (
                <>
                  <div className="col-span-2 text-left px-1">
                    <div className="text-[8px] uppercase font-bold text-muted">Ad Rate</div>
                    <div className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {landmark.fixedCost || "$20 / mo"}
                    </div>
                  </div>
                  <div className="border-l border-border/50">
                    <div className="text-[8px] uppercase font-bold text-muted">Screen</div>
                    <div className="font-mono text-xs font-bold text-coral">#{landmark.billboardNumber || 1}</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-[8px] uppercase font-bold text-muted">Rank</div>
                    <div className="font-mono text-xs font-black text-coral">#{landmark.rank}</div>
                  </div>
                  <div className="border-x border-border/50">
                    <div className="text-[8px] uppercase font-bold text-muted">Value</div>
                    <div className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 truncate">
                      {formatINR(landmark.amount || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase font-bold text-muted">Floors</div>
                    <div className="font-mono text-xs font-bold text-charcoal dark:text-white">
                      {landmark.floors || 1}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* actions */}
            <div className="flex gap-2">
              {isBillboard && !claimed && (
                <button
                  onClick={() => landmark.onBook?.(landmark)}
                  className="flex-1 py-2.5 rounded-xl bg-coral hover:bg-coral-dark text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                >
                  <IconSparkle className="w-3.5 h-3.5" />
                  Book this screen
                </button>
              )}
              {!isBillboard && p.id && (
                <Link
                  to={`/products/${p.id}`}
                  className="flex-1 py-2.5 rounded-xl bg-coral hover:bg-coral-dark text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md transition-colors"
                >
                  <IconSparkle className="w-3.5 h-3.5" />
                  View ranking
                </Link>
              )}
              {p.websiteUrl && (
                <a
                  href={p.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-surface-soft dark:bg-elevated border border-border hover:border-coral/50 text-charcoal dark:text-cream font-bold text-[11px] flex items-center gap-1 transition-colors"
                >
                  Visit <IconArrowUpRight className="w-3.5 h-3.5 text-coral" />
                </a>
              )}
            </div>

            <p className="mt-2.5 text-[9px] text-muted text-center">
              <kbd className="px-1 py-0.5 rounded bg-surface-soft dark:bg-elevated font-mono font-bold border border-border/60">Esc</kbd>{" "}
              to keep walking
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
