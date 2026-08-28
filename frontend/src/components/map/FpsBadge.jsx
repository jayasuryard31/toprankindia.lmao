import { useState, useEffect } from "react";
import { useMapStore } from "./useMapStore";

/**
 * FPS display component designed to sit directly alongside the Currency Selector.
 * Renders real-time framerate with status color indicator and expandable telemetry popup.
 */
export default function FpsBadge({ className = "" }) {
  const storeFps = useMapStore((s) => s.fps);
  const [fps, setFps] = useState(storeFps || 60);
  const [stats, setStats] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const poll = () => {
      const engine = window.__triEngine;
      if (engine?.getRenderStats) {
        const s = engine.getRenderStats();
        if (s && typeof s.fps === "number") {
          setFps(s.fps);
          setStats(s);
          return;
        }
      }
      if (storeFps) {
        setFps(storeFps);
      }
    };
    const id = setInterval(poll, 350);
    poll();
    return () => clearInterval(id);
  }, [storeFps]);

  const dotColor =
    fps >= 50 ? "bg-emerald-400" : fps >= 30 ? "bg-amber-400" : "bg-rose-400";
  const textColor =
    fps >= 50 ? "text-emerald-500 dark:text-emerald-400" : fps >= 30 ? "text-amber-500 dark:text-amber-400" : "text-rose-500 dark:text-rose-400";

  return (
    <div className="relative pointer-events-auto select-none">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 h-9 px-3 rounded-2xl glass-panel shadow-feather-lg border border-border/80 text-xs font-bold transition-all hover:bg-surface-soft dark:hover:bg-elevated cursor-pointer group ${className}`}
        title="Engine FPS · Click for graphics telemetry"
      >
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75 animate-ping`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
        </span>
        <span className={`font-mono font-black ${textColor}`}>
          {fps}
        </span>
        <span className="text-[10px] font-semibold text-muted tracking-tight">
          FPS
        </span>
      </button>

      {/* Expanded Render Telemetry Dropdown */}
      {open && stats && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-11 z-50 w-56 p-3 rounded-2xl glass-panel shadow-2xl border border-border/80 text-xs text-charcoal dark:text-cream animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
            <span className="font-bold text-[11px] uppercase tracking-wider text-muted">
              Graphics Telemetry
            </span>
            <span className={`font-mono font-black ${textColor}`}>
              {fps} FPS
            </span>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted font-sans">Draw Calls:</span>
              <span className="font-bold">{stats.calls ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-sans">Triangles:</span>
              <span className="font-bold">{stats.triangles ? (stats.triangles / 1000).toFixed(1) + "k" : "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-sans">Geometries:</span>
              <span className="font-bold">{stats.geometries ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-sans">Textures:</span>
              <span className="font-bold">{stats.textures ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-sans">Shaders:</span>
              <span className="font-bold">{stats.programs ?? "-"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

