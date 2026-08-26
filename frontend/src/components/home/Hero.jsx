import { formatINR } from "../../utils/formatINR";
import ProductSubmission from "./ProductSubmission";

export default function Hero({ topAmount = 4005 }) {
  const displayAmount = topAmount ? formatINR(topAmount) : "₹4,005";

  return (
    <section className="py-6 sm:py-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Side: Editorial Asymmetric Typography */}
        <div className="lg:col-span-5 flex flex-col justify-center text-left">
          {/* Main Editorial Headline */}
          <div className="relative inline-block mb-3">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-charcoal dark:text-white leading-[1.1]">
              Who&apos;s on top{" "}
              <span className="italic text-coral relative inline-block">
                today?
                {/* Floating decorative petal / sparkle accent */}
                <span className="absolute -top-3 -right-6 text-coral/80 transform rotate-12 scale-90 select-none animate-float">
                  ✨
                </span>
              </span>
            </h1>
          </div>

          {/* Current Top Spot Metric */}
          <div className="mt-4 sm:mt-6">
            <p className="text-xs sm:text-sm uppercase tracking-wider font-bold text-muted mb-1">
              The top spot is currently
            </p>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-coral">
                {displayAmount}
              </span>
            </div>
            <p className="text-xs text-muted/80 mt-2 max-w-sm">
              Live competitive product leaderboard. Pay any amount to outrank other startups and claim visibility.
            </p>
          </div>
        </div>

        {/* Right Side: Command Submission Surface */}
        <div className="lg:col-span-7">
          <ProductSubmission />
        </div>
      </div>
    </section>
  );
}
