import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "../services/adminApi";
import {
  IconWallet,
  IconCity,
  IconGlobe,
  IconTrophy,
  IconBarChart,
  IconTrendUp,
  IconMousePointer,
  IconArrowUpRight,
  IconShield,
  IconClock,
} from "../components/common/Icons";

/**
 * /admin/stats/:code — a private operations dashboard, not a page anyone
 * links to. The URL segment is forwarded as a header to the backend and
 * checked against `process.env.SECRET_CODE` there; nothing here decides
 * whether the code is right, so the real secret never ships in this bundle.
 */

const money = (n, symbol = "₹") =>
  symbol + Math.round(Number(n || 0)).toLocaleString("en-IN");
const usd = (n) => "$" + Math.round(Number(n || 0)).toLocaleString("en-US");
const compact = (n) => {
  const v = Number(n || 0);
  if (v >= 1e7) return (v / 1e7).toFixed(1) + "Cr";
  if (v >= 1e5) return (v / 1e5).toFixed(1) + "L";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(v);
};
const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/** Flag emoji from an ISO 3166-1 alpha-2 code — no icon assets needed. */
function flagFor(code) {
  if (!code || code === "XX" || code.length !== 2) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => A + (c.charCodeAt(0) - 65))
  );
}

function Card({ className = "", children }) {
  return (
    <div
      className={`glass-panel rounded-2xl border border-border/80 shadow-feather-lg p-5 flex flex-col ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="flex items-center gap-2 text-charcoal dark:text-cream font-bold text-sm tracking-tight">
          <Icon className="w-4 h-4 text-coral" />
          {title}
        </div>
        {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function Bar({ pct, colorClass = "bg-coral" }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-surface-soft dark:bg-elevated overflow-hidden">
      <div
        className={`h-full rounded-full ${colorClass}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function StatBig({ value, label }) {
  return (
    <div>
      <div className="text-3xl font-black text-charcoal dark:text-cream tracking-tight font-mono">
        {value}
      </div>
      <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted mt-1">
        {label}
      </div>
    </div>
  );
}

function LoginGate({ onSubmit, error, loading }) {
  const [val, setVal] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(val);
        }}
        className="glass-panel rounded-3xl border border-border/80 shadow-feather-lg p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <div className="flex items-center gap-2 text-coral font-bold text-sm">
          <IconShield className="w-4 h-4" /> ADMIN ACCESS
        </div>
        <p className="text-xs text-muted -mt-2">
          Enter the admin code to view Velora Harbor's operations dashboard.
        </p>
        <input
          autoFocus
          type="password"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Admin code"
          className="w-full px-3.5 py-2.5 rounded-xl bg-surface-soft dark:bg-elevated border border-border text-sm text-charcoal dark:text-cream outline-none focus:border-coral/50 transition-colors font-mono"
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <button
          type="submit"
          disabled={loading || !val}
          className="w-full py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Checking…" : "Unlock Dashboard"}
        </button>
      </form>
    </div>
  );
}

export default function AdminStats() {
  const { code: routeCode } = useParams();
  const [manualCode, setManualCode] = useState(null);
  const code = manualCode ?? routeCode ?? "";

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-stats", code],
    queryFn: () => getAdminStats(code),
    enabled: Boolean(code),
    retry: false,
    refetchInterval: 30000, // live-ish: re-pull every 30s while the tab is open
  });

  if (!code || (isError && error?.status === 401)) {
    return (
      <LoginGate
        loading={isFetching}
        error={code ? "Invalid admin code." : null}
        onSubmit={(v) => setManualCode(v)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-7 w-7 rounded-full border-2 border-coral/30 border-t-coral animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-sm text-muted mb-3">Couldn't load the dashboard: {error.message}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-coral text-white text-sm font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const s = data;
  const topCountries = s.traffic.byCountry.slice(0, 8);
  const maxCountry = topCountries[0]?.count || 1;

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-charcoal dark:text-cream flex items-center gap-2">
            <IconShield className="w-5 h-5 text-coral" /> Velora Harbor · Operations
          </h1>
          <p className="text-xs text-muted mt-1 font-mono">
            {new Date(s.generatedAt).toLocaleString()} · auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 rounded-xl bg-surface-soft dark:bg-elevated border border-border text-xs font-semibold text-muted hover:text-charcoal dark:hover:text-cream transition-colors cursor-pointer"
        >
          {isFetching ? "Refreshing…" : "Refresh now"}
        </button>
      </div>

      {/* ── Bento grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-min">
        {/* Payments — wide */}
        <Card className="sm:col-span-2 lg:col-span-2">
          <CardHeader icon={IconWallet} title="Payments" sub="Plots + billboard bookings, PAID only" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <StatBig value={money(s.payments.totalCollectedINR)} label={`${s.payments.productPaymentCount} plot payments`} />
            <StatBig value={usd(s.payments.totalCollectedUSD)} label={`${s.payments.billboardPaymentCount} billboard payments`} />
          </div>
          <div className="flex-1 overflow-y-auto max-h-48 scrollbar-hide -mx-1 px-1">
            {s.payments.recent.length === 0 && (
              <p className="text-xs text-muted py-4 text-center">No payments yet.</p>
            )}
            {s.payments.recent.map((p) => (
              <div
                key={p.kind + p.id}
                className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${
                      p.kind === "PLOT"
                        ? "bg-coral/10 text-coral"
                        : "bg-blue-500/10 text-blue-500"
                    }`}
                  >
                    {p.kind}
                  </span>
                  <span className="truncate text-charcoal dark:text-cream font-medium">{p.brand}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-muted">
                  <span className="font-mono font-semibold text-charcoal dark:text-cream">
                    {p.currency === "USD" ? usd(p.amount) : money(p.amount)}
                  </span>
                  <span>{timeAgo(p.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Plots sold */}
        <Card>
          <CardHeader icon={IconCity} title="Plots" sub="Claimed city lots" />
          <StatBig value={`${s.plots.claimed}/${s.plots.total}`} label={`${s.plots.pctSold}% sold`} />
          <div className="mt-3">
            <Bar pct={s.plots.pctSold} />
          </div>
          <p className="text-[11px] text-muted mt-2">{s.plots.vacant} plots still vacant</p>
        </Card>

        {/* Billboards live */}
        <Card>
          <CardHeader icon={IconTrendUp} title="Billboards" sub="Times Square + city-wide" />
          <StatBig
            value={`${s.billboards.live}/${s.billboards.total}`}
            label="currently live"
          />
          <div className="mt-3">
            <Bar pct={(s.billboards.live / Math.max(1, s.billboards.total)) * 100} colorClass="bg-blue-500" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {s.billboards.list
              .filter((b) => b.isLive)
              .slice(0, 6)
              .map((b) => (
                <span
                  key={b.code}
                  title={`${b.name} — ${b.brand}`}
                  className="px-2 py-0.5 rounded-full bg-surface-soft dark:bg-elevated text-[10px] font-mono text-muted"
                >
                  #{b.number}
                </span>
              ))}
            {s.billboards.live === 0 && (
              <span className="text-[11px] text-muted">None booked yet.</span>
            )}
          </div>
        </Card>

        {/* Leaderboard — tall */}
        <Card className="lg:row-span-2">
          <CardHeader icon={IconTrophy} title="Leaderboard" sub="Top brands by bid" />
          <div className="flex-1 overflow-y-auto max-h-[26rem] scrollbar-hide space-y-2">
            {s.leaderboard.length === 0 && (
              <p className="text-xs text-muted py-4 text-center">No active products yet.</p>
            )}
            {s.leaderboard.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 py-1">
                <span
                  className={`w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-black flex-shrink-0 ${
                    p.rank === 1
                      ? "bg-amber-400/20 text-amber-500"
                      : "bg-surface-soft dark:bg-elevated text-muted"
                  }`}
                >
                  {p.rank}
                </span>
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
                ) : (
                  <span className="w-6 h-6 rounded-md bg-coral/10 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-charcoal dark:text-cream truncate">
                    {p.brand}
                  </p>
                  <p className="text-[10px] text-muted truncate">{p.district || "Unplaced"}</p>
                </div>
                <span className="text-xs font-mono font-bold text-coral flex-shrink-0">
                  {money(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Country breakdown — wide */}
        <Card className="sm:col-span-2 lg:col-span-2">
          <CardHeader icon={IconGlobe} title="Visitors by Country" sub={`${s.traffic.totalVisits30d} visits in the last 30 days`} />
          <div className="space-y-2 flex-1">
            {topCountries.length === 0 && (
              <p className="text-xs text-muted py-4 text-center">No traffic recorded yet.</p>
            )}
            {topCountries.map((c) => (
              <div key={c.code} className="flex items-center gap-2.5">
                <span className="text-base flex-shrink-0" aria-hidden>
                  {flagFor(c.code)}
                </span>
                <span className="text-xs text-charcoal dark:text-cream font-medium w-28 truncate flex-shrink-0">
                  {c.name}
                </span>
                <div className="flex-1">
                  <Bar pct={(c.count / maxCountry) * 100} />
                </div>
                <span className="text-[11px] font-mono text-muted w-16 text-right flex-shrink-0">
                  {c.count} · {c.pct}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Traffic sources */}
        <Card>
          <CardHeader icon={IconMousePointer} title="Traffic Sources" sub="Where visits come from" />
          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-48 scrollbar-hide">
            {s.traffic.byReferrer.length === 0 && (
              <p className="text-xs text-muted py-4 text-center">No referrer data yet.</p>
            )}
            {s.traffic.byReferrer.map((r) => (
              <div key={r.source} className="flex items-center justify-between text-xs">
                <span className="text-charcoal dark:text-cream truncate">{r.source}</span>
                <span className="font-mono text-muted flex-shrink-0">{r.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Brand traffic */}
        <Card>
          <CardHeader icon={IconBarChart} title="Brand Traffic" sub="Clicks by brand" />
          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-48 scrollbar-hide">
            {s.brandTraffic.length === 0 && (
              <p className="text-xs text-muted py-4 text-center">No click data yet.</p>
            )}
            {s.brandTraffic.map((b) => (
              <div key={b.productId} className="flex items-center justify-between text-xs gap-2">
                <span className="text-charcoal dark:text-cream truncate flex items-center gap-1">
                  {b.brand}
                  {b.websiteUrl && <IconArrowUpRight className="w-2.5 h-2.5 text-muted flex-shrink-0" />}
                </span>
                <span className="font-mono text-coral font-semibold flex-shrink-0">{b.clicks}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top pages */}
        <Card>
          <CardHeader icon={IconClock} title="Top Pages" sub="Most-visited paths" />
          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-48 scrollbar-hide">
            {s.traffic.byPath.length === 0 && (
              <p className="text-xs text-muted py-4 text-center">No page-view data yet.</p>
            )}
            {s.traffic.byPath.map((p) => (
              <div key={p.path} className="flex items-center justify-between text-xs gap-2">
                <span className="text-charcoal dark:text-cream truncate font-mono">{p.path}</span>
                <span className="font-mono text-muted flex-shrink-0">{p.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick totals strip */}
        <Card className="sm:col-span-2 lg:col-span-4 flex-row items-center justify-around gap-4 flex-wrap py-4">
          {[
            ["Total collected (INR)", money(s.payments.totalCollectedINR)],
            ["Billboard revenue (USD)", usd(s.payments.totalCollectedUSD)],
            ["Plots sold", `${compact(s.plots.claimed)}/${compact(s.plots.total)}`],
            ["Billboards live", `${s.billboards.live}/${s.billboards.total}`],
            ["Countries reached", s.traffic.byCountry.length],
            ["30-day visits", s.traffic.totalVisits30d],
          ].map(([label, val]) => (
            <div key={label} className="text-center px-2">
              <div className="text-lg font-black text-charcoal dark:text-cream font-mono">{val}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted mt-0.5">{label}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
