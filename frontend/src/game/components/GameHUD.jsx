import GameMinimap from "./GameMinimap";
import { formatINR } from "../../utils/formatINR";

/**
 * Minimal in-game HUD. Deliberately sparse — it recedes while you just walk
 * around and only speaks up for an interaction prompt.
 */
export default function GameHUD({
  locate = {},
  interactable,
  locked,
  onExit,
  engine,
  playerRef,
  camYawRef,
  online = 1,
  isTouch = false,
}) {
  return (
    <>
      {/* TOP-LEFT — where am I */}
      <div className="absolute top-3 left-3 sm:top-5 sm:left-5 pointer-events-none select-none">
        <div className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-black/35 backdrop-blur-md border border-white/10 text-white">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-white/55">District</div>
          <div className="text-xs sm:text-sm font-bold tracking-wide">{locate.district || "—"}</div>
          <div className="text-[10px] sm:text-[11px] text-white/60 font-mono">{locate.area || ""}</div>
        </div>
      </div>

      {/* TOP-RIGHT — online presence */}
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5 pointer-events-auto select-none flex flex-col items-end gap-1.5 sm:gap-2">
        <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/10 flex items-center gap-1.5 sm:gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-white font-mono">{online} Online</span>
        </div>
        <button
          onClick={onExit}
          className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-black/35 hover:bg-black/55 active:bg-black/60 backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] font-semibold text-white/80 transition-colors cursor-pointer"
        >
          {isTouch ? "Exit" : "Exit to Map · Esc"}
        </button>
      </div>

      {/* BOTTOM-LEFT — keyboard hints (desktop only; touch has its own stick) */}
      {!isTouch && (
        <div className="absolute bottom-5 left-5 pointer-events-none select-none">
          <div className="px-3 py-2 rounded-xl bg-black/25 backdrop-blur-md border border-white/10 text-[11px] text-white/70 font-mono leading-relaxed">
            <span className="text-white/90">WASD</span> move · <span className="text-white/90">Shift</span> sprint ·{" "}
            <span className="text-white/90">Space</span> jump · <span className="text-white/90">C</span> crouch ·{" "}
            <span className="text-white/90">E</span> interact · <span className="text-white/90">O</span> emote
            {!locked && <div className="text-white/45 mt-0.5">click the view to capture the mouse</div>}
          </div>
        </div>
      )}

      {/* minimap — bottom-right on desktop, tucked under the top bar on touch
          so it never collides with the action buttons */}
      <div
        className={`absolute pointer-events-none select-none ${
          isTouch ? "top-20 right-3 scale-[0.62] origin-top-right" : "bottom-5 right-5"
        }`}
      >
        <GameMinimap engine={engine} playerRef={playerRef} camYawRef={camYawRef} />
      </div>

      {/* interaction prompt */}
      {interactable && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 pointer-events-none select-none ${
            isTouch ? "top-[30%] w-[min(20rem,88vw)]" : "bottom-[16vh]"
          }`}
        >
          <div
            className="px-4 py-2.5 rounded-2xl bg-black/55 backdrop-blur-md border shadow-lg text-white text-center animate-in fade-in slide-in-from-bottom-2 duration-150"
            style={{ borderColor: interactable.color || "#F05A38" }}
          >
            {interactable.type === "landmark" ? (
              <>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">
                  #{interactable.rank} Ranked Landmark
                </div>
                <div className="text-base font-black tracking-wide">{interactable.brand}</div>
                <div className="text-xs text-white/70 font-mono">
                  {formatINR(interactable.amount || 0)} · {interactable.district}
                </div>
              </>
            ) : interactable.type === "billboard" ? (
              <>
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300 font-bold">
                  ★ Sponsored Billboard · {interactable.fixedCost || "₹50,000 / mo"}
                </div>
                <div className="text-base font-black tracking-wide">{interactable.brand}</div>
                <div className="text-xs text-white/70 font-mono">{interactable.billboardName}</div>
              </>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">
                  {interactable.prebuilt ? "Building For Sale" : "Available Plot"}
                </div>
                <div className="text-base font-black tracking-wide">{interactable.plotNumber}</div>
                <div className="text-xs text-white/70 font-mono">
                  {interactable.prebuilt
                    ? `${interactable.floors} floors · $${interactable.fixedPriceUSD} fixed`
                    : interactable.districtName}
                </div>
              </>
            )}
            <div className="mt-1 text-[11px] flex items-center justify-center gap-1.5">
              {!isTouch && (
                <kbd className="px-1.5 py-0.5 rounded bg-white/15 font-bold">E</kbd>
              )}
              <span>
                {isTouch ? "Tap " : ""}
                {isTouch && <span className="font-bold">E</span>}
                {isTouch ? " to " : ""}
                {interactable.type === "landmark"
                  ? isTouch ? "view brand" : "View brand"
                  : interactable.type === "billboard"
                  ? isTouch ? "view sponsor ad" : "View sponsor ad"
                  : interactable.prebuilt
                  ? isTouch ? "buy this building" : "Buy this building"
                  : isTouch ? "claim this plot" : "Claim this plot"}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
