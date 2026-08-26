import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useProduct } from "../hooks/useProducts";
import { usePayment } from "../hooks/usePayment";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../utils/formatINR";
import { timeAgo } from "../utils/formatDate";
import { trackClick } from "../services/productsApi";
import { isValidAmount } from "../utils/validation";
import LogoFallback from "../components/common/LogoFallback";
import Skeleton from "../components/common/Skeleton";
import ErrorState from "../components/common/ErrorState";
import Modal from "../components/common/Modal";
import RankingProgressChart from "../components/products/RankingProgressChart";
import {
  IconArrowUpRight,
  IconCopy,
  IconCheck,
  IconCrown,
  IconTrophy,
  IconWallet,
  IconZap,
  IconShield,
  IconClock,
  IconGlobe,
  IconMousePointer,
  IconDocument,
  CategoryIcon,
} from "../components/common/Icons";

export default function ProductDetails() {
  const { id } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: product, isLoading, error, refetch } = useProduct(id);
  const { createOrder, verifyPayment } = usePayment();

  const [outbidOpen, setOutbidOpen] = useState(false);
  const [inlineAmount, setInlineAmount] = useState("");
  const [outbidAmount, setOutbidAmount] = useState("");
  const [outbidLoading, setOutbidLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [copied, setCopied] = useState(false);
  const [successModal, setSuccessModal] = useState(null);

  const handleVisit = async () => {
    if (!product?.websiteUrl) return;
    try {
      await trackClick(id);
    } catch (err) {
      void err;
    }
    window.open(product.websiteUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const triggerPayment = async (amtToPay) => {
    if (!isValidAmount(amtToPay)) {
      toast.error("Please enter a valid amount in INR (minimum ₹1)");
      return;
    }

    setOutbidLoading(true);
    setLoadingStep("Securing your spot on the board...");

    try {
      const order = await createOrder.mutateAsync({
        websiteUrl: product.websiteUrl,
        categoryId: product.category?.id || 15,
        amount: Number(amtToPay),
      });

      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        setOutbidLoading(false);
        return;
      }

      setLoadingStep("Opening Razorpay Checkout...");

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: order.amount * 100,
        currency: order.currency || "INR",
        name: "TopRankIndia",
        description: `Rank ${product.websiteName} for ${formatINR(order.amount)}`,
        order_id: order.orderId,
        handler: async (response) => {
          setOutbidLoading(true);
          setLoadingStep("Verifying payment and updating rank...");
          try {
            const result = await verifyPayment.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            setOutbidOpen(false);
            setSuccessModal({
              product: result.product,
              previousRank: product.allTimeRank,
              newRank: result.product.allTimeRank,
            });
            setInlineAmount("");
            setOutbidAmount("");
            queryClient.invalidateQueries({ queryKey: ["product", id] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["home"] });
          } catch {
            toast.error("Payment verification failed. Please contact support.");
          }
          setOutbidLoading(false);
        },
        modal: {
          ondismiss: () => setOutbidLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed.");
        setOutbidLoading(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err?.message || "Failed to create order.");
      setOutbidLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-64 rounded-3xl" />
          <Skeleton className="lg:col-span-5 h-64 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-64 rounded-3xl" />
          <Skeleton className="lg:col-span-5 h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <ErrorState
          message="Product not found on the leaderboard."
          onRetry={refetch}
        />
        <div className="mt-6">
          <Link
            to="/"
            className="text-xs font-bold text-coral hover:underline uppercase tracking-wider"
          >
            ← Back to Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  // Feature tag pills for About website card
  const featureTags = [
    "No sign up",
    "100% Free",
    "Works offline",
    "Modern UI",
    "Fast & Lightweight",
  ];

  // Clean display hostname
  const displayHost = product.websiteUrl ? product.websiteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "website.com";

  // Recent activity list
  const recentActivities = [
    {
      id: "ra-1",
      action: "Someone outbid and moved to",
      rank: `#${product.categoryRank || 1}`,
      time: "2 mins ago",
      amount: `+${formatINR(5)}`,
      iconBg: "bg-emerald-500/10 text-emerald-600",
      icon: "↗",
    },
    {
      id: "ra-2",
      action: "New bidder entered and claimed",
      rank: `#${(product.categoryRank || 1) + 5}`,
      time: "17 mins ago",
      amount: `+${formatINR(3)}`,
      iconBg: "bg-purple-500/10 text-purple-600",
      icon: "👤",
    },
    {
      id: "ra-3",
      action: "Another bid placed",
      rank: "",
      time: "47 mins ago",
      amount: `+${formatINR(2)}`,
      iconBg: "bg-amber-500/10 text-amber-600",
      icon: "⚡",
    },
    {
      id: "ra-4",
      action: "Website added to the leaderboard",
      rank: "",
      time: timeAgo(product.createdAt),
      amount: "₹0",
      iconBg: "bg-blue-500/10 text-blue-600",
      icon: "+",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 ambient-bg">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-muted mb-6 flex-wrap">
        <Link to="/" className="hover:text-coral transition-colors font-medium">
          Leaderboard
        </Link>
        <span className="text-muted/40">›</span>
        {product.category && (
          <Link
            to={`/categories/${product.category.id}`}
            className="hover:text-coral transition-colors font-medium"
          >
            {product.category.name}
          </Link>
        )}
        <span className="text-muted/40">›</span>
        <span className="text-charcoal dark:text-cream font-semibold truncate max-w-[200px]">
          {product.websiteName}
        </span>
      </nav>

      {/* TOP SECTION: Hero Overview & Top 3 Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6">
        {/* Top Left: Product Identity Hero */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 rounded-3xl glass-panel shadow-feather-lg border border-border/80 relative overflow-hidden">
          {/* Feather / Warm Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-coral/15 via-amber-500/10 to-transparent rounded-full filter blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start gap-5 relative z-10">
            {/* Squircle Logo */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-3xl bg-coral/20 filter blur-md scale-110 pointer-events-none" />
              {product.logoUrl ? (
                <img
                  src={product.logoUrl}
                  alt={product.websiteName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-border/80 shadow-md relative z-10"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <LogoFallback
                name={product.websiteName}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl text-2xl relative z-10 ${
                  product.logoUrl ? "hidden" : "flex"
                }`}
              />
            </div>

            {/* Product Details */}
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal dark:text-white tracking-tight leading-snug">
                {product.websiteName}
              </h1>

              {/* Category Pill & Added Time */}
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                {product.category && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-soft dark:bg-elevated text-charcoal dark:text-cream border border-border/70 font-semibold">
                    <CategoryIcon idOrName={product.category.id} className="w-3.5 h-3.5 text-coral" />
                    <span>{product.category.name}</span>
                  </span>
                )}
                <span className="text-muted">
                  • Added {timeAgo(product.createdAt)}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-muted mt-3 leading-relaxed">
                {product.description || "Play ambient sounds, relax, and discover what others are building on TopRankIndia."}
              </p>
            </div>
          </div>

          {/* Action CTAs Row */}
          <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-border/50 relative z-10">
            <button
              onClick={handleVisit}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-coral hover:bg-coral-hover text-white text-xs font-bold uppercase tracking-wider shadow-feather-coral hover:-translate-y-0.5 transition-all cursor-pointer group"
            >
              <span>Visit Website</span>
              <IconArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            <button
              onClick={() => setOutbidOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-surface dark:bg-surface-soft border border-border hover:border-coral/40 text-charcoal dark:text-white hover:text-coral text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <span>Outbid for any amount</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-surface dark:bg-surface-soft border border-border text-muted hover:text-charcoal dark:hover:text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
              title="Copy link"
            >
              {copied ? <IconCheck className="w-3.5 h-3.5 text-emerald-500" /> : <IconCopy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        {/* Top Right: 3 Key Metrics Card */}
        <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl glass-panel shadow-feather-lg border border-border/80 flex flex-col justify-between">
          <div className="grid grid-cols-3 gap-3 text-center divide-x divide-border/60">
            {/* Category Rank */}
            <div className="px-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted flex items-center justify-center gap-1 mb-1.5">
                <IconCrown className="w-3 h-3 text-amber-500" />
                Category
              </span>
              <div className="font-mono text-2xl sm:text-3xl font-black text-charcoal dark:text-white">
                #{product.categoryRank || 1}
              </div>
              <p className="text-[10px] text-muted mt-1 leading-tight">
                of 71 in {product.category?.name || "Category"}
              </p>
              <Link
                to={`/categories/${product.category?.id || ""}`}
                className="text-[10px] font-semibold text-coral hover:underline mt-2 inline-block"
              >
                See category ranking
              </Link>
            </div>

            {/* Overall Rank */}
            <div className="px-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted flex items-center justify-center gap-1 mb-1.5">
                <IconTrophy className="w-3 h-3 text-indigo-500" />
                Overall
              </span>
              <div className="font-mono text-2xl sm:text-3xl font-black text-charcoal dark:text-white">
                #{product.allTimeRank || 1}
              </div>
              <p className="text-[10px] text-muted mt-1 leading-tight">
                of 1,608 on all-time board
              </p>
              <Link
                to="/"
                className="text-[10px] font-semibold text-coral hover:underline mt-2 inline-block"
              >
                See all ranking
              </Link>
            </div>

            {/* Total Spent */}
            <div className="px-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted flex items-center justify-center gap-1 mb-1.5">
                <IconWallet className="w-3 h-3 text-emerald-500" />
                Total Spent
              </span>
              <div className="font-mono text-2xl sm:text-3xl font-black text-coral">
                {formatINR(product.currentAmount)}
              </div>
              <p className="text-[10px] text-muted mt-1 leading-tight">
                Paid to hold this rank
              </p>
              <button
                onClick={() => setOutbidOpen(true)}
                className="text-[10px] font-semibold text-coral hover:underline mt-2 inline-block cursor-pointer"
              >
                View payment history
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: About This Website & Take a Higher Position Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6">
        {/* Middle Left: About This Website Card */}
        <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl glass-panel shadow-feather border border-border/80">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-1 rounded-lg bg-coral/10 text-coral">
              <IconDocument className="w-4 h-4" />
            </span>
            <h2 className="font-bold text-sm text-charcoal dark:text-cream uppercase tracking-wider">
              About this website
            </h2>
          </div>

          <p className="text-xs text-muted leading-relaxed mb-5">
            {product.description || `${product.websiteName} is listed on TopRankIndia to claim discoverability and organic traffic from builders and founders.`}
          </p>

          {/* Feature Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {featureTags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-surface-soft dark:bg-elevated border border-border/70 text-charcoal dark:text-cream"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Metadata Table */}
          <div className="pt-4 border-t border-border/50 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-muted text-[11px] block mb-0.5 flex items-center gap-1">
                <IconGlobe className="w-3 h-3 text-coral" /> Website
              </span>
              <a
                href={product.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-coral hover:underline truncate block"
              >
                {displayHost}
              </a>
            </div>

            <div>
              <span className="text-muted text-[11px] block mb-0.5 flex items-center gap-1">
                <IconClock className="w-3 h-3 text-muted" /> Added
              </span>
              <span className="font-medium text-charcoal dark:text-cream">
                {timeAgo(product.createdAt)}
              </span>
            </div>

            <div>
              <span className="text-muted text-[11px] block mb-0.5 flex items-center gap-1">
                <IconClock className="w-3 h-3 text-muted" /> Last updated
              </span>
              <span className="font-medium text-charcoal dark:text-cream">
                {timeAgo(product.updatedAt || product.createdAt)}
              </span>
            </div>

            <div>
              <span className="text-muted text-[11px] block mb-0.5 flex items-center gap-1">
                <IconMousePointer className="w-3 h-3 text-muted" /> Clicks
              </span>
              <span className="font-mono font-bold text-charcoal dark:text-cream">
                {product.clickCount != null ? product.clickCount.toLocaleString() : 0}
              </span>
            </div>

            <div>
              <span className="text-muted text-[11px] block mb-0.5 flex items-center gap-1">
                <IconZap className="w-3 h-3 text-coral" /> Total bids
              </span>
              <span className="font-mono font-bold text-charcoal dark:text-cream">
                {product.totalBids || 1}
              </span>
            </div>
          </div>
        </div>

        {/* Middle Right: "Take a Higher Position" Command Surface */}
        <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-[#181614] text-white border border-stone-800 shadow-feather-lg relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight mb-1 text-white">
              Take a higher position
            </h3>
            <p className="text-xs text-stone-400 mb-5">
              There is no minimum bid. You decide the amount.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                triggerPayment(inlineAmount);
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-stone-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={inlineAmount}
                    onChange={(e) => setInlineAmount(e.target.value)}
                    placeholder="Enter any amount"
                    min="1"
                    step="1"
                    required
                    className="w-full pl-8 pr-3.5 py-3 bg-[#24211D] border border-stone-700/80 rounded-2xl text-white font-mono text-sm placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-coral/50 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={outbidLoading}
                  className="px-5 py-3 bg-gradient-to-r from-coral to-orange-500 hover:from-coral-hover hover:to-orange-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-feather-coral hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
                >
                  <span>{outbidLoading ? "Processing..." : "Outbid Now"}</span>
                  <IconZap className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Trust Badges Footer */}
            <div className="mt-5 pt-4 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-400">
              <div className="flex items-center gap-1.5">
                <IconShield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Secure payment powered by Razorpay</span>
              </div>

              {/* Payment Methods */}
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-stone-500 uppercase tracking-widest">
                <span>VISA</span>
                <span>•</span>
                <span>Mastercard</span>
                <span>•</span>
                <span>UPI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Ranking Progress Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Bottom Left: Ranking Progress Chart */}
        <div className="lg:col-span-7">
          <RankingProgressChart currentRank={product.categoryRank || 59} />
        </div>

        {/* Bottom Right: Recent Activity Card */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl glass-panel shadow-feather border border-border/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-coral/10 text-coral">
                <IconZap className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-xs sm:text-sm text-charcoal dark:text-cream uppercase tracking-wider">
                Recent activity
              </h3>
            </div>
            <Link
              to="/"
              className="text-xs font-semibold text-muted hover:text-coral transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-surface-soft dark:hover:bg-elevated transition-colors border border-transparent hover:border-border/60"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${act.iconBg}`}
                  >
                    {act.icon}
                  </div>
                  <div className="text-xs text-charcoal dark:text-cream truncate">
                    <span>{act.action}</span>{" "}
                    {act.rank && <span className="font-mono font-bold text-coral">{act.rank}</span>}
                    <div className="text-[10px] text-muted">{act.time}</div>
                  </div>
                </div>

                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  {act.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outbid Dialog Modal */}
      <Modal
        isOpen={outbidOpen}
        onClose={() => {
          setOutbidOpen(false);
          setOutbidAmount("");
        }}
        maxWidth="max-w-md"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 rounded-lg bg-coral/10 text-coral">
              <IconZap className="w-4 h-4" />
            </span>
            <h2 className="font-serif text-2xl font-bold text-charcoal dark:text-white">
              Take a Higher Position
            </h2>
          </div>

          <p className="text-xs text-muted mb-4">
            Increase {product.websiteName}&apos;s rank on the public leaderboard. Higher spend ranks higher immediately.
          </p>

          <div className="p-3.5 rounded-2xl bg-surface-soft dark:bg-elevated border border-border/80 mb-4 flex items-center justify-between">
            <span className="text-xs text-muted">Current Total Spend</span>
            <span className="font-mono text-base font-bold text-charcoal dark:text-white">
              {formatINR(product.currentAmount)}
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              triggerPayment(outbidAmount);
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1 px-1">
                Your Amount (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal dark:text-cream font-mono font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  value={outbidAmount}
                  onChange={(e) => setOutbidAmount(e.target.value)}
                  placeholder="Enter amount (e.g. 500)"
                  min="1"
                  step="1"
                  required
                  autoFocus
                  className="w-full pl-8 pr-4 py-3 bg-surface dark:bg-surface border border-border rounded-xl text-charcoal dark:text-cream font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted px-1">
              <IconShield className="w-3.5 h-3.5 text-coral" />
              <span>No minimum requirement. You choose how high to rank.</span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={outbidLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-coral to-orange-500 hover:from-coral-hover hover:to-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-feather-coral transition-all disabled:opacity-60 cursor-pointer"
              >
                {outbidLoading ? loadingStep || "Processing..." : "CONTINUE TO PAYMENT →"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Post-Outbid Celebration Modal */}
      {successModal && (
        <Modal
          isOpen={true}
          onClose={() => setSuccessModal(null)}
          maxWidth="max-w-md"
        >
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 shadow-sm animate-bounce">
              <IconCheck className="w-8 h-8" />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-widest text-coral mb-1 block">
              Spot Secured
            </span>

            <h2 className="font-serif text-3xl font-bold text-charcoal dark:text-white mb-2">
              Rank Updated!
            </h2>

            <p className="text-sm text-muted mb-6">
              {product.websiteName} has moved higher on the living leaderboard.
            </p>

            <div className="flex items-center justify-center gap-4 py-4 px-6 rounded-2xl bg-surface-soft dark:bg-elevated border border-border/80 mb-6">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">
                  Previous Rank
                </span>
                <span className="font-mono text-xl font-bold text-muted line-through">
                  #{successModal.previousRank || "?"}
                </span>
              </div>

              <span className="text-coral font-bold text-xl">→</span>

              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">
                  New Rank
                </span>
                <span className="font-mono text-2xl font-black text-coral">
                  #{successModal.newRank || 1}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSuccessModal(null)}
              className="w-full px-4 py-3 bg-coral hover:bg-coral-hover text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-feather-coral transition-all"
            >
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

