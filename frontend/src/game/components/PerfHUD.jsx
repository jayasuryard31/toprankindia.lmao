import { useEffect, useRef, useState } from "react";

/**
 * Dev perf readout. Hidden by default; toggle with the backtick (`) key.
 * Reads renderer.info via engine.getRenderStats() — no cost when hidden.
 */
export default function PerfHUD({ engine }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(null);
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
    if (!open || !engine) return undefined;
    const id = setInterval(() => setS(engine.getRenderStats?.() || null), 400);
    return () => clearInterval(id);
  }, [open, engine]);

  if (!open || !s) return null;

  const row = (k, v) => (
    <div className="flex justify-between gap-6">
      <span className="text-white/50">{k}</span>
      <span className="text-white font-bold tabular-nums">{v}</span>
    </div>
  );

  return (
    <div
      ref={boxRef}
      className="absolute top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none
                 px-3 py-2 rounded-lg bg-black/70 backdrop-blur-md border border-white/10
                 font-mono text-[11px] leading-relaxed min-w-[168px]"
    >
      {row("fps", s.fps)}
      {row("draw calls", s.calls)}
      {row("triangles", (s.triangles / 1000).toFixed(0) + "k")}
      {row("geometries", s.geometries)}
      {row("textures", s.textures)}
      {row("programs", s.programs)}
      {row("pixel ratio", s.pixelRatio)}
      {row("postfx", s.postfx ? "on" : "off")}
      <div className="mt-1 text-white/30 text-[9px]">` to toggle</div>
    </div>
  );
}
