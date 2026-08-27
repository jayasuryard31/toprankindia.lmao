import { useState, useRef, useEffect } from "react";
import { useMapStore } from "./useMapStore";

const ROWS = [
  { key: "districts", label: "City Districts" },
  { key: "liveFeed", label: "Live Feed" },
  { key: "topEmpires", label: "Top Empires" },
  { key: "overview", label: "Overview Mini-map" },
  { key: "legend", label: "Map Legend" },
  { key: "stats", label: "Bottom Statistics" },
];

export default function PanelToggles() {
  const panels = useMapStore((s) => s.panels);
  const togglePanel = useMapStore((s) => s.togglePanel);
  const setAllPanels = useMapStore((s) => s.setAllPanels);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const hiddenCount = ROWS.filter((r) => !panels[r.key]).length;

  return (
    <div ref={ref} className="relative select-none pointer-events-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 h-9 rounded-2xl glass-panel shadow-feather-lg border text-xs font-bold transition-colors cursor-pointer ${
          open ? "border-coral/40 text-coral" : "border-border/80 text-charcoal dark:text-cream hover:text-coral"
        }`}
      >
        <span className="text-sm leading-none">▤</span>
        <span>Panels</span>
        {hiddenCount > 0 && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-coral/15 text-coral">
            {hiddenCount} hidden
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-11 right-0 w-60 glass-panel rounded-2xl shadow-feather-lg border border-border/80 p-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-2 py-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Map Layers</span>
          </div>

          <div className="flex flex-col">
            {ROWS.map((r) => (
              <button
                key={r.key}
                onClick={() => togglePanel(r.key)}
                className="flex items-center justify-between px-2 py-2 rounded-xl text-xs font-semibold text-charcoal dark:text-cream hover:bg-surface-soft dark:hover:bg-elevated transition-colors cursor-pointer"
              >
                <span>{r.label}</span>
                <span
                  className={`relative w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${
                    panels[r.key] ? "bg-coral" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${
                      panels[r.key] ? "left-[15px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 pt-1.5 mt-1 border-t border-border/50 px-1">
            <button
              onClick={() => setAllPanels(false)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-surface-soft dark:bg-elevated hover:bg-coral/10 hover:text-coral transition-colors cursor-pointer"
            >
              Clean map
            </button>
            <button
              onClick={() => setAllPanels(true)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-surface-soft dark:bg-elevated hover:bg-coral/10 hover:text-coral transition-colors cursor-pointer"
            >
              Restore all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
