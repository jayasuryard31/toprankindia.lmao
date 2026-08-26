import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  IconCity,
  IconGrid,
  IconFlame,
  IconBarChart,
  IconUser,
  IconArrowUpRight,
} from "../common/Icons";

export default function MobileNav({ onOpenBidModal }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("city");

  const tabs = [
    { id: "city", label: "City", path: "/", icon: IconCity },
    { id: "categories", label: "Categories", path: "/categories", icon: IconGrid },
    { id: "activity", label: "Activity", path: "/activity", icon: IconFlame },
    { id: "stats", label: "Stats", path: "/stats", icon: IconBarChart },
    { id: "about", label: "About", path: "/about", icon: IconUser },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none">
      {/* Floating Mobile Build Spot Action */}
      <div className="px-4 pb-2 flex justify-center pointer-events-auto">
        <button
          onClick={onOpenBidModal}
          className="w-full max-w-xs py-2.5 px-4 rounded-2xl bg-gradient-to-r from-coral to-orange-500 hover:from-coral-hover hover:to-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-feather-coral flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
        >
          <span>BUILD SPOT</span>
          <IconArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Navigation Tab Bar */}
      <div className="glass-panel border-t border-border/80 px-2 py-1.5 flex items-center justify-around shadow-feather-lg pointer-events-auto bg-surface/95 backdrop-blur-md">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path || activeTab === tab.id;

          return (
            <Link
              key={tab.id}
              to={tab.path}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? "text-coral font-bold"
                  : "text-muted hover:text-charcoal dark:hover:text-cream"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

