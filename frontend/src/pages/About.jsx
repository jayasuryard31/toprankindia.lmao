import { Link } from "react-router-dom";
import {
  IconSparkle,
  IconShield,
  IconArrowUpRight,
} from "../components/common/Icons";

export default function About() {
  const steps = [
    {
      num: "01",
      title: "Submit Your Product URL",
      desc: "Enter your startup, SaaS, developer tool, or creator product. We automatically retrieve your metadata and favicon.",
    },
    {
      num: "02",
      title: "Set Your Spend (INR)",
      desc: "There is no minimum bid. Whether you choose ₹50, ₹500, or ₹50,000, you have complete control over how high you rank.",
    },
    {
      num: "03",
      title: "Instant Verification",
      desc: "Complete checkout seamlessly via Razorpay. Once confirmed, our server positions your product on the board instantly.",
    },
    {
      num: "04",
      title: "Defend & Outbid",
      desc: "Anyone can outbid or rank higher anytime. If you want to move up, simply increase your product's total spend.",
    },
  ];

  const rules = [
    {
      title: "Higher Spend Ranks Higher",
      desc: "Products are sorted strictly by total amount spent in descending order. Equal spends prioritize earlier payments.",
    },
    {
      title: "No Minimum Bid",
      desc: "Anyone can join the leaderboard with any valid positive integer amount. There is no artificial gatekeeping.",
    },
    {
      title: "Duplicate URLs Update Product",
      desc: "Submitting an existing product URL updates its total spend and boosts its ranking position rather than creating duplicates.",
    },
    {
      title: "Real-Time Public Discoverability",
      desc: "Clicks on your product take visitors directly to your website. Top positions receive maximum platform exposure.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 ambient-bg">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coral/10 text-coral text-xs font-bold uppercase tracking-wider mb-4 border border-coral/20">
          <IconSparkle className="w-3.5 h-3.5" />
          <span>The Living Product Board</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-charcoal dark:text-white tracking-tight leading-tight">
          Where Indian Startups &amp; Products Compete on Value
        </h1>
        <p className="text-sm sm:text-base text-muted mt-4 leading-relaxed">
          TopRankIndia is an open, internet-native product leaderboard where visibility is earned through transparent bidding economics.
        </p>
      </div>

      {/* How It Works Grid */}
      <div className="mb-14">
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted text-center mb-6">
          How Ranking Works
        </h2>
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

      {/* Platform Rules */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-feather-lg border border-border/80 mb-12">
        <div className="flex items-center gap-2 text-xs font-bold text-coral uppercase tracking-widest mb-4">
          <IconShield className="w-4 h-4" />
          <span>Core Economics &amp; Integrity</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {rules.map((rule) => (
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
      <div className="p-8 rounded-3xl bg-gradient-to-br from-surface-soft to-surface dark:from-elevated dark:to-surface border border-border text-center shadow-feather">
        <img
          src="/toprankindiaLOGO.png"
          alt="TopRankIndia"
          className="h-10 w-auto object-contain mx-auto mb-4"
        />
        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal dark:text-white mb-2">
          Ready to rank your product on the board?
        </h3>
        <p className="text-xs sm:text-sm text-muted max-w-md mx-auto mb-6">
          Claim today&apos;s spotlight and get discovered by thousands of founders, builders, and early adopters.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-coral hover:bg-coral-hover text-white font-bold text-xs uppercase tracking-wider shadow-feather-coral hover:-translate-y-0.5 transition-all"
        >
          <span>Go to Leaderboard</span>
          <IconArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
