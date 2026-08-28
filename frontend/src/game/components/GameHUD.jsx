import { useEffect, useState } from "react";
import GameMinimap from "./GameMinimap";
import { formatINR } from "../../utils/formatINR";

/**
 * Minimal in-game HUD. Deliberately sparse - it recedes while you just walk
 * around and only speaks up for an interaction prompt.
 */
export default function GameHUD({
  locate = {},
  interactable,
  nearbyPlayer,
  onOpenChat,
  locked,
  onExit,
  engine,
  playerRef,
  camYawRef,
  online = 1,
  isTouch = false,
}) {
  const [fps, setFps] = useState(() => Math.round(engine?._fps || 60));

  useEffect(() => {
    if (!engine) return undefined;
    const poll = () => {
      const s = engine.getRenderStats?.();
      if (s && typeof s.fps === "number") setFps(s.fps);
    };
    const id = setInterval(poll, 250);
    poll();
    return () => clearInterval(id);
  }, [engine]);

  return (
    <>
      {/* TOP-LEFT - where am I */}
      <div className="absolute top-3 left-3 sm:top-5 sm:left-5 pointer-events-none select-none">
        <div className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-black/35 backdrop-blur-md border border-white/10 text-white">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-white/55">District</div>
          <div className="text-xs sm:text-sm font-bold tracking-wide">{locate.district || "-"}</div>
          <div className="text-[10px] sm:text-[11px] text-white/60 font-mono">{locate.area || ""}</div>
        </div>
      </div>

      {/* TOP-RIGHT - FPS & online presence */}
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5 pointer-events-auto select-none flex flex-col items-end gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/10 flex items-center gap-1.5 font-mono text-[11px] sm:text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                fps >= 50 ? "bg-emerald-400" : fps >= 30 ? "bg-amber-400" : "bg-rose-400"
              }`}
            />
            <span className="font-bold text-white tabular-nums">{fps} FPS</span>
          </div>
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/10 flex items-center gap-1.5 sm:gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-white font-mono">{online} Online</span>
          </div>
        </div>
        <button
          onClick={onExit}
          className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-black/35 hover:bg-black/55 active:bg-black/60 backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] font-semibold text-white/80 transition-colors cursor-pointer"
        >
          {isTouch ? "Exit" : "Exit to Map · Esc"}
        </button>
      </div>

      {/* BOTTOM-LEFT - keyboard hints */}
      {!isTouch && (
        <div className="absolute bottom-5 left-5 pointer-events-none select-none">
          <div className="px-3 py-2 rounded-xl bg-black/25 backdrop-blur-md border border-white/10 text-[11px] text-white/70 font-mono leading-relaxed">
            <span className="text-white/90">WASD</span> move · <span className="text-white/90">Shift</span> run ·{" "}
            <span className="text-white/90">Space</span> jump · <span className="text-white/90">C</span> crouch ·{" "}
            <span className="text-white/90">E</span> interact · <span className="text-sky-300 font-bold">M</span> chat ·{" "}
            <span className="text-white/90">O</span> emote
            {!locked && <div className="text-white/45 mt-0.5">click the view to capture the mouse</div>}
          </div>
        </div>
      )}

      {/* Proximity Player Chat prompt */}
      {nearbyPlayer && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 pointer-events-auto select-none ${
            isTouch ? "top-[18%] w-[min(20rem,88vw)]" : "bottom-[26vh]"
          }`}
        >
          <button
            onClick={onOpenChat}
            className="w-full px-4 py-2 rounded-2xl bg-slate-900/85 hover:bg-slate-900 active:scale-95 backdrop-blur-md border border-sky-400/60 shadow-xl text-white text-center animate-in fade-in slide-in-from-bottom-2 duration-150 cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full animate-ping flex-shrink-0"
                style={{ backgroundColor: nearbyPlayer.color ? `#${nearbyPlayer.color.toString(16).padStart(6, "0")}` : "#38bdf8" }}
              />
              <div className="text-left">
                <div className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">
                  Nearby Player Detected
                </div>
                <div className="text-xs font-bold text-white">
                  {nearbyPlayer.name} ({nearbyPlayer.distance.toFixed(1)}m)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 bg-sky-500/20 px-2.5 py-1 rounded-xl border border-sky-400/30 group-hover:bg-sky-500/30">
              {!isTouch && <kbd className="px-1.5 py-0.5 rounded bg-white/20 font-mono text-[10px] text-white">M</kbd>}
              <span>{isTouch ? "Chat 💬" : "Press M to Chat 💬"}</span>
            </div>
          </button>
        </div>
      )}

      {/* minimap - bottom-right on desktop, tucked under the top bar on touch
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
                  ★ {interactable.isOccupied ? "Sponsored Billboard" : "Available Ad Space"} · {interactable.fixedCost || "$20 / mo"}
                </div>
                <div className="text-base font-black tracking-wide">
                  {interactable.isOccupied ? interactable.brand : `Billboard #${interactable.billboardNumber}`}
                </div>
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
                  ? isTouch ? "view brand" : "View Brand HQ"
                  : interactable.type === "billboard"
                  ? interactable.isOccupied
                    ? isTouch ? "visit website" : "Visit Website ↗"
                    : isTouch ? "buy billboard" : "Buy Billboard Space ($)"
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
