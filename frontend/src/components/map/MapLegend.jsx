const ROWS = [
  { c: "#F59E0B", label: "#1 Position" },
  { c: "#F97316", label: "Top 3 Position" },
  { c: "#8B5CF6", label: "Top 10 Position" },
  { c: "#3B82F6", label: "Ranked Plot" },
  { c: "#10B981", label: "Live Bidding" },
  { c: "#F05A38", label: "Bid Cluster" },
];

export default function MapLegend() {
  return (
    <div className="w-full glass-panel rounded-2xl shadow-feather-lg border border-border/80 p-3.5">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-charcoal dark:text-cream mb-2.5">
        Map Legend
      </h4>
      <ul className="space-y-2">
        {ROWS.map((r) => (
          <li key={r.label} className="flex items-center gap-2.5">
            <span
              className="w-3 h-3 rounded-[4px] flex-shrink-0 shadow-xs"
              style={{ backgroundColor: r.c }}
            />
            <span className="text-xs font-semibold text-charcoal/80 dark:text-cream/80">
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
