import { Link } from "react-router-dom";
import {
  IconSparkle,
  IconShield,
  IconArrowUpRight,
  IconGlobe,
  IconGrid,
  IconZap,
} from "../components/common/Icons";

export default function About() {
  const pillars = [
    {
      icon: "🏙️",
      title: "Permanent Urban Plots",
      desc: "Claim your dedicated real estate across Downtown, Waterfront, and Midtown districts. Once acquired, your plot coordinates are permanently locked to your brand.",
    },
    {
      icon: "👑",
      title: "Dynamic Skyscraper Architecture",
      desc: "Your product's economic bid directly constructs your building's height and architectural prestige. Rank #1 earns the iconic Crown Apex Landmark towering over the city.",
    },
    {
      icon: "🌆",
      title: "Times Square & LED Billboards",
      desc: "Advertise across high-impact digital billboards and mega-screens with monthly sponsorship cycles. In-world players can walk right up to inspect your brand.",
    },
    {
      icon: "🚶",
      title: "Living 3D World Simulation",
      desc: "Explore the metropolis in third-person mode with realistic road traffic, functioning traffic lights, uniformed traffic police officers, and interactive district plazas.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Claim Your Urban Plot",
      desc: "Select a vacant plot or prime avenue. Enter your product URL, category, and initial investment to stake your claim.",
    },
    {
      num: "02",
      title: "Raise Your Skyscraper",
      desc: "Our 3D engine immediately erects a custom-styled skyscraper on your lot, featuring your real brand logo, verified ownership plaque, and facade billboards.",
    },
    {
      num: "03",
      title: "Outbid & Ascend the Skyline",
      desc: "Boost your position at any time. When you reach Rank #1, the majestic Crown Tower structure transforms directly on your plot.",
    },
    {
      num: "04",
      title: "Global Traffic & Discoverability",
      desc: "Visitors and founders worldwide navigate the 3D city, clicking buildings and billboards to visit your website and discover your product.",
    },
  ];

  const economics = [
    {
      title: "Transparent Public Valuation",
      desc: "Every plot, building height, and leaderboard rank is determined strictly by open, verified bid economics. No black-box algorithms.",
    },
    {
      title: "Permanent Plot Security",
      desc: "Your plot coordinates remain yours. Ranking changes update building design and skyline height on your plot without relocating your address.",
    },
    {
      title: "Direct Traffic Redirection",
      desc: "Every building ownership board and city billboard features interactive click-throughs directly to your live product URL.",
    },
    {
      title: "Global Multi-Currency Support",
      desc: "Seamlessly browse and transact in USD, INR, EUR, GBP, and major world currencies with instant payment gateway processing.",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14 ambient-bg">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-coral/10 text-coral text-xs font-bold uppercase tracking-wider mb-4 border border-coral/20">
          <IconGlobe className="w-3.5 h-3.5" />
          <span>The Global 3D Virtual Metropolis</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-charcoal dark:text-white tracking-tight leading-tight">
          Where Global Products &amp; Startups Build Their Digital Skyline
        </h1>
        <p className="text-sm sm:text-base text-muted mt-5 leading-relaxed max-w-2xl mx-auto">
          TopRankPlots is the world’s premier 3D virtual metropolis. We transform flat internet lists into a living, breathing urban economy where products compete for visual dominance and real-world discoverability.
        </p>
      </div>

      {/* 4 Pillars of the Metropolis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
        {pillars.map((p) => (
          <div
            key={p.title}
            className="p-6 sm:p-7 rounded-3xl glass-panel border border-border/80 shadow-feather hover:shadow-feather-md transition-all group"
          >
            <div className="text-3xl mb-3.5 select-none">{p.icon}</div>
            <h3 className="font-bold text-base sm:text-lg text-charcoal dark:text-white mb-2 group-hover:text-coral transition-colors">
              {p.title}
            </h3>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-coral uppercase tracking-widest mb-1.5">
            <IconSparkle className="w-3.5 h-3.5" />
            <span>Urban Lifecycle</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal dark:text-white">
            How TopRankPlots Works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="p-6 rounded-3xl card-soft shadow-feather hover:shadow-feather-md transition-all relative overflow-hidden"
            >
              <span className="font-mono text-2xl font-black text-coral/40 block mb-2">
                {step.num}
              </span>
              <h3 className="font-bold text-base text-charcoal dark:text-white mb-1.5">
                {step.title}
              </h3>
              <p className="text-xs text-muted leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Core Economics & Platform Integrity */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-feather-lg border border-border/80 mb-14">
        <div className="flex items-center gap-2 text-xs font-bold text-coral uppercase tracking-widest mb-4">
          <IconShield className="w-4 h-4" />
          <span>Core Economics &amp; World Integrity</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {economics.map((rule) => (
            <div key={rule.title}>
              <h4 className="font-bold text-sm text-charcoal dark:text-white mb-1">
                {rule.title}
              </h4>
              <p className="text-xs text-muted leading-relaxed">{rule.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action Banner */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-surface-soft via-surface to-surface-soft dark:from-elevated dark:via-background dark:to-elevated border border-border text-center shadow-feather">
        <img
          src="/toprankindiaLOGO.png"
          alt="TopRankPlots"
          className="h-10 w-auto object-contain mx-auto mb-4"
        />
        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal dark:text-white mb-2">
          Claim Your Plot in the Global Metropolis
        </h3>
        <p className="text-xs sm:text-sm text-muted max-w-md mx-auto mb-6">
          Join hundreds of international products and startups building their presence on the 3D skyline today.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-coral hover:bg-coral-hover text-white font-bold text-xs uppercase tracking-wider shadow-feather-coral hover:-translate-y-0.5 transition-all"
          >
            <span>Explore 3D City Map</span>
            <IconArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            to="/categories"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-surface-soft dark:bg-elevated hover:bg-border/60 text-charcoal dark:text-cream font-bold text-xs uppercase tracking-wider transition-all"
          >
            <IconGrid className="w-4 h-4" />
            <span>Browse Categories</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
