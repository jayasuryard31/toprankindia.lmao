import { useState, useMemo } from "react";
import { IconTrendUp } from "../common/Icons";

export default function RankingProgressChart({ currentRank = 59 }) {
  const [timeRange, setTimeRange] = useState("7D");

  // Generate realistic smooth trend curve points based on product rank
  const chartData = useMemo(() => {
    const rank = currentRank || 59;
    if (timeRange === "7D") {
      return [
        { label: "7d ago", rank: Math.min(100, rank + 35) },
        { label: "5d ago", rank: Math.min(100, rank + 28) },
        { label: "3d ago", rank: Math.min(100, rank + 18) },
        { label: "Yesterday", rank: Math.min(100, rank + 8) },
        { label: "Now", rank: rank },
      ];
    } else if (timeRange === "30D") {
      return [
        { label: "30d ago", rank: Math.min(150, rank + 65) },
        { label: "20d ago", rank: Math.min(130, rank + 45) },
        { label: "10d ago", rank: Math.min(110, rank + 25) },
        { label: "5d ago", rank: Math.min(90, rank + 12) },
        { label: "Now", rank: rank },
      ];
    } else {
      return [
        { label: "Start", rank: Math.min(200, rank + 90) },
        { label: "Mid", rank: Math.min(120, rank + 40) },
        { label: "Recent", rank: Math.min(80, rank + 15) },
        { label: "Now", rank: rank },
      ];
    }
  }, [timeRange, currentRank]);

  // SVG dimensions
  const width = 500;
  const height = 160;
  const paddingX = 40;
  const paddingY = 30;

  const minVal = Math.min(...chartData.map((d) => d.rank));
  const maxVal = Math.max(...chartData.map((d) => d.rank));
  const range = maxVal - minVal || 1;

  // Inverted Y: Lower rank number is visually higher up on the chart
  const points = chartData.map((d, i) => {
    const x = paddingX + (i / (chartData.length - 1)) * (width - paddingX * 2);
    // Invert: best rank (minVal) is at the top (paddingY), worst (maxVal) is at bottom
    const y = paddingY + ((d.rank - minVal) / range) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  // Create smooth SVG cubic bezier path
  const pathD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
  }, "");

  // Area path for gradient fill
  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const areaD = `${pathD} L ${lastPt.x} ${height - 10} L ${firstPt.x} ${height - 10} Z`;

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-3xl shadow-feather border border-border/80 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-coral/10 text-coral">
              <IconTrendUp className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-sm text-charcoal dark:text-cream">
              Ranking progress
            </h3>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Your rank over time. Higher is better.
          </p>
        </div>

        {/* Time Range Pills */}
        <div className="inline-flex items-center bg-surface-soft dark:bg-elevated p-1 rounded-xl border border-border/70 self-start sm:self-auto">
          {["7D", "30D", "All"].map((rangeKey) => (
            <button
              key={rangeKey}
              onClick={() => setTimeRange(rangeKey)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeRange === rangeKey
                  ? "bg-surface dark:bg-surface text-coral shadow-sm font-bold"
                  : "text-muted hover:text-charcoal dark:hover:text-white"
              }`}
            >
              {rangeKey}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full overflow-hidden">
        {/* Y Axis Grid Lines */}
        <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none opacity-30 text-[10px] font-mono text-muted pr-2">
          <div className="border-b border-border/60 pb-0.5">#{Math.max(1, Math.round(minVal - 5))}</div>
          <div className="border-b border-border/60 pb-0.5">#{Math.round(minVal + range * 0.5)}</div>
          <div className="border-b border-border/60 pb-0.5">#{Math.round(maxVal + 5)}</div>
        </div>

        {/* SVG Chart */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-40 overflow-visible relative z-10"
        >
          <defs>
            <linearGradient id="rankAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F05A38" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F05A38" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaD} fill="url(#rankAreaGrad)" />

          {/* Line Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#F05A38"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Data Points */}
          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={idx === points.length - 1 ? 5 : 3.5}
              fill={idx === points.length - 1 ? "#F05A38" : "white"}
              stroke="#F05A38"
              strokeWidth={idx === points.length - 1 ? 3 : 2}
            />
          ))}

          {/* Floating Tooltip Pin on the Latest / Current Point */}
          <g transform={`translate(${lastPt.x - 30}, ${lastPt.y - 34})`}>
            <rect
              width="60"
              height="24"
              rx="8"
              fill="#FFFFFF"
              className="dark:fill-[#1C1917] stroke-coral/30 dark:stroke-coral/40 filter drop-shadow-sm"
            />
            <text
              x="30"
              y="16"
              textAnchor="middle"
              className="fill-charcoal dark:fill-white font-mono text-[11px] font-bold"
            >
              #{lastPt.rank} Now
            </text>
          </g>
        </svg>

        {/* X Axis Labels */}
        <div className="flex items-center justify-between text-[11px] text-muted font-medium pt-2 px-3">
          {chartData.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

