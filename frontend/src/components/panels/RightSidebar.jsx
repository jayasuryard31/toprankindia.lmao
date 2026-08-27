import { Link } from "react-router-dom";
import { formatINR } from "../../utils/formatINR";
import { timeAgo } from "../../utils/formatDate";
import LogoFallback from "../common/LogoFallback";
import { IconFlame, IconCrown } from "../common/Icons";

export default function RightSidebar({
  topProducts = [],
  onSelectProduct,
  recentActivity = [],
  showLiveFeed = true,
  showTopEmpires = true,
}) {
  const activityList = recentActivity.length > 0 ? recentActivity : [
    { id: "1", websiteName: "Brown Noise", amount: 500, createdAt: new Date() },
    { id: "2", websiteName: "CodePilot", amount: 450, createdAt: new Date() },
    { id: "3", websiteName: "WriteSonic AI", amount: 400, createdAt: new Date() },
    { id: "4", websiteName: "StudyGenie", amount: 350, createdAt: new Date() },
  ];

  return (
    <div className="flex flex-col gap-3 select-none pointer-events-auto">
      {/* 1. Live Feed */}
      {showLiveFeed && (
      <div className="glass-panel p-4 rounded-3xl shadow-feather border border-border/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <IconFlame className="w-3.5 h-3.5 text-coral" />
            <span className="font-bold text-xs uppercase tracking-wider text-charcoal dark:text-cream">
              Live Feed
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {activityList.slice(0, 4).map((item, idx) => {
            const avatarColors = [
              "bg-purple-500 text-white",
              "bg-emerald-500 text-white",
              "bg-amber-500 text-white",
              "bg-blue-500 text-white",
            ];
            const iconBg = avatarColors[idx % avatarColors.length];

            return (
              <div
                key={item.id}
                className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-surface-soft dark:hover:bg-elevated transition-colors text-xs"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${iconBg}`}
                >
                  {(item.websiteName || "P").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-charcoal dark:text-cream leading-snug">
                    <span className="font-bold">{item.websiteName}</span>{" "}
                    <span className="text-muted">outbid to</span>{" "}
                    <span className="font-mono font-semibold text-coral">
                      {formatINR(item.amount)}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-light mt-0.5 block">
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 2. Top Empires Leaderboard */}
      {showTopEmpires && (
      <>
      <div className="glass-panel p-4 rounded-3xl shadow-feather border border-border/80">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <IconCrown className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-bold text-xs uppercase tracking-wider text-charcoal dark:text-cream">
              Top Empires
            </span>
          </div>
          <span className="text-[10px] font-semibold text-muted">By Value ⌵</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {topProducts.slice(0, 5).map((p, idx) => {
            const rank = idx + 1;
            const rankBadgeColor =
              rank === 1
                ? "bg-amber-400 text-amber-950 font-black"
                : rank === 2
                ? "bg-emerald-500 text-white font-bold"
                : rank === 3
                ? "bg-purple-500 text-white font-bold"
                : rank === 4
                ? "bg-rose-500 text-white font-bold"
                : "bg-surface-soft dark:bg-elevated text-muted";

            return (
              <button
                key={p.id}
                onClick={() => onSelectProduct(p)}
                className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-surface-soft dark:hover:bg-elevated transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] flex-shrink-0 ${rankBadgeColor}`}
                  >
                    {rank}
                  </span>

                  <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 border border-border/70">
                    {p.logoUrl ? (
                      <img
                        src={p.logoUrl}
                        alt={p.websiteName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <LogoFallback
                      name={p.websiteName}
                      className={`w-full h-full text-[10px] ${p.logoUrl ? "hidden" : "flex"}`}
                    />
                  </div>

                  <div className="min-w-0">
                    <span className="font-bold text-xs text-charcoal dark:text-cream truncate block group-hover:text-coral transition-colors">
                      {p.websiteName}
                    </span>
                    <span className="text-[10px] text-muted truncate block">
                      {p.category?.name || "General"}
                    </span>
                  </div>
                </div>

                <span className="font-mono text-xs font-bold text-coral flex-shrink-0">
                  {formatINR(p.currentAmount)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-2.5 mt-2 border-t border-border/50 text-center">
          <Link
            to="/categories"
            className="text-[11px] font-bold text-muted hover:text-coral transition-colors inline-block"
          >
            View All Categories &amp; Rankings →
          </Link>
        </div>
      </div>

      {/* 3. How It Works Card */}
      <div className="glass-panel p-4 rounded-3xl shadow-feather border border-border/80">
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted block mb-2.5">
          How It Works
        </span>

        <div className="flex flex-col gap-2.5 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-surface-soft dark:bg-elevated border border-border flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              1
            </span>
            <div>
              <span className="font-bold text-charcoal dark:text-white block">
                Add your product
              </span>
              <span className="text-[11px] text-muted leading-tight block">
                Enter URL, choose district &amp; amount
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-surface-soft dark:bg-elevated border border-border flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              2
            </span>
            <div>
              <span className="font-bold text-charcoal dark:text-white block">
                Place your bid
              </span>
              <span className="text-[11px] text-muted leading-tight block">
                Pay securely and claim your building
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-surface-soft dark:bg-elevated border border-border flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              3
            </span>
            <div>
              <span className="font-bold text-charcoal dark:text-white block">
                Climb the ranks
              </span>
              <span className="text-[11px] text-muted leading-tight block">
                Higher bids get taller buildings
              </span>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
