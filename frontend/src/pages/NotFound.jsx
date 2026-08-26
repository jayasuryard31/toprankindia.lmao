import { Link } from "react-router-dom";
import { IconSparkle, IconArrowUpRight } from "../components/common/Icons";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center ambient-bg">
      <div className="w-16 h-16 rounded-3xl bg-coral/10 text-coral flex items-center justify-center mx-auto mb-6 shadow-sm border border-coral/20">
        <IconSparkle className="w-8 h-8 animate-pulse" />
      </div>

      <span className="font-mono text-xs font-bold uppercase tracking-widest text-coral mb-2 block">
        Error 404
      </span>

      <h1 className="font-serif text-4xl sm:text-5xl font-bold text-charcoal dark:text-white tracking-tight mb-3">
        Looks like this product fell off the board.
      </h1>

      <p className="text-sm text-muted max-w-sm mx-auto mb-8">
        The spot you are looking for does not exist or has been outranked into another dimension.
      </p>

      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3.5 bg-coral hover:bg-coral-hover text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-feather-coral hover:-translate-y-0.5 transition-all"
      >
        <span>Back to Leaderboard</span>
        <IconArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
