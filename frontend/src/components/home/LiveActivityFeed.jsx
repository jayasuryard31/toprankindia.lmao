import { Link } from "react-router-dom";
import { IconFlame, IconArrowRight } from "../common/Icons";

export default function LiveActivityFeed() {
  // Dynamic activity items
  const activityItems = [
    {
      id: "act-1",
      name: "Brown Noise",
      action: "Outbid",
      target: "Voco",
      rank: "#59",
      time: "2m ago",
      iconBg: "bg-orange-500/10 text-orange-600",
      type: "outbid",
    },
    {
      id: "act-2",
      name: "CodePilot",
      action: "Outbid",
      target: "3 products",
      rank: "#12",
      time: "5m ago",
      iconBg: "bg-blue-500/10 text-blue-600",
      type: "outbid",
    },
    {
      id: "act-3",
      name: "WriteSonic AI",
      action: "Outbid & entered",
      target: "Top 20",
      rank: "#18",
      time: "7m ago",
      iconBg: "bg-purple-500/10 text-purple-600",
      type: "top",
    },
    {
      id: "act-4",
      name: "StudyGenie",
      action: "New entry in",
      target: "Education",
      rank: "#24",
      time: "9m ago",
      iconBg: "bg-emerald-500/10 text-emerald-600",
      type: "new",
    },
    {
      id: "act-5",
      name: "StackEdge",
      action: "Outbid & moved to",
      target: "#15",
      rank: "#15",
      time: "11m ago",
      iconBg: "bg-indigo-500/10 text-indigo-600",
      type: "outbid",
    },
  ];

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-3xl shadow-feather border border-border/80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-orange-500/10 text-coral">
            <IconFlame className="w-4 h-4" />
          </span>
          <h3 className="font-bold text-xs sm:text-sm text-charcoal dark:text-cream uppercase tracking-wider">
            Live Activity
          </h3>
        </div>

        {/* Live Indicator Pulse */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-coral" />
        </span>
      </div>

      {/* Activity Items Stream */}
      <div className="flex flex-col gap-2.5">
        {activityItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-soft dark:hover:bg-elevated transition-colors border border-transparent hover:border-border/60"
          >
            {/* Avatar Initial */}
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${item.iconBg}`}
            >
              {item.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Event Description */}
            <div className="min-w-0 flex-1 text-xs">
              <div className="text-charcoal dark:text-cream leading-tight">
                <span className="font-bold">{item.name}</span>{" "}
                <span className="text-muted">{item.action}</span>{" "}
                <span className="font-semibold text-charcoal dark:text-white">
                  {item.target}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                {item.rank && (
                  <span className="font-mono text-coral font-bold">{item.rank}</span>
                )}
                <span>·</span>
                <span>{item.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All Activity */}
      <div className="pt-3 mt-2 border-t border-border/50">
        <Link
          to="/"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold text-muted hover:text-coral transition-colors"
        >
          <span>View all activity</span>
          <IconArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

