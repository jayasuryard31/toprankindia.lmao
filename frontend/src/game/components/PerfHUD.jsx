import { useEffect, useRef, useState } from "react";

/**
 * FPS & Performance HUD.
 * Always displays a sleek, real-time FPS badge on screen; click or press backtick (`) to expand full render telemetry.
 */
export default function PerfHUD({ engine }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ fps: 60 });
  const boxRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Backquote" && !e.metaKey && !e.ctrlKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!engine) return undefined;
    const poll = () => {
      const s = engine.getRenderStats?.();
      if (s && typeof s.fps === "number") {
        setStats(s);
      }
    };
    const id = setInterval(poll, 250);
    poll();
    return () => clearInterval(id);
  }, [engine]);

  const fps = stats?.fps ?? 60;
  const dotColor =
    fps >= 50 ? "bg-emerald-400" : fps >= 30 ? "bg-amber-400" : "bg-rose-400";
  const dotPing =
    fps >= 50 ? "bg-emerald-400" : fps >= 30 ? "bg-amber-400" : "bg-rose-400";

  const row = (k, v) => (
    <div className="flex items-center justify-between gap-6 py-0.5">
      <span className="text-white/55 font-normal">{k}</span>
      <span className="text-white font-bold tabular-nums font-mono">{v}</span>
    </div>
  );

  return (
    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-40 select-none pointer-events-auto">
      {/* Persistent FPS Badge */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 active:bg-black/70 backdrop-blur-md border border-white/15 text-white transition-all shadow-md cursor-pointer text-xs group"
        title="Click to view engine performance metrics (`)"
      >
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full ${dotPing} opacity-75 animate-ping`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
        </span>
        <span className="font-bold tracking-tight text-white/90 group-hover:text-white font-mono tabular-nums">
          {fps} <span className="text-[10px] font-medium text-white/60">FPS</span>
        </span>
        <span className="text-[9px] text-white/40 group-hover:text-white/70 ml-0.5">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded Telemetry Modal */}
      {open && (
        <div
          ref={boxRef}
          className="mt-2 p-3.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15
                     text-[11px] leading-relaxed min-w-[200px] shadow-2xl text-white animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 font-bold text-[11px] text-white/85">
            <span className="flex items-center gap-1.5">
              <span>⚡</span>
              <span>Render Telemetry</span>
            </span>
            <span className="text-[9px] font-mono font-normal text-white/40">` toggle</span>
          </div>
          <div className="flex flex-col">
            {row("FPS", fps)}
            {row("Frame Time", fps > 0 ? `${(1000 / fps).toFixed(1)} ms` : "-")}
            {row("Draw Calls", stats.calls ?? "-")}
            {row(
              "Triangles",
              typeof stats.triangles === "number"
                ? `${(stats.triangles / 1000).toFixed(0)}k`
                : "-"
            )}
            {row("Geometries", stats.geometries ?? "-")}
            {row("Textures", stats.textures ?? "-")}
            {row("Shaders", stats.programs ?? "-")}
            {row("Pixel Ratio", stats.pixelRatio ?? "-")}
            {row("Post-FX", stats.postfx ? "On" : "Off")}
          </div>
        </div>
      )}
    </div>
  );
}
