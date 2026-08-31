import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "../../hooks/useCategories";
import { usePayment } from "../../hooks/usePayment";
import { useProducts } from "../../hooks/useProducts";
import { useToast } from "../../context/ToastContext";
import { isValidUrl, isValidAmount, formatUrlInput, extractHostname, getFaviconUrl } from "../../utils/validation";
import { formatINR } from "../../utils/formatINR";
import Modal from "../common/Modal";
import {
  IconGlobe,
  IconShield,
  IconArrowUpRight,
  IconCheck,
  IconTrendUp,
} from "../common/Icons";

export default function ProductSubmission() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: categories } = useCategories();
  const { createOrder, verifyPayment } = usePayment();
  const { data: allProducts } = useProducts({ limit: 50, sort: "rank" });

  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [successModal, setSuccessModal] = useState(null);
  const [faviconError, setFaviconError] = useState(false);

  // Real-time domain and favicon detection
  const detectedHost = useMemo(() => {
    return extractHostname(url);
  }, [url]);

  const faviconUrl = useMemo(() => {
    if (!detectedHost || !detectedHost.includes(".")) return "";
    return getFaviconUrl(url);
  }, [detectedHost, url]);

  // Dynamic live ranking estimation preview based on current leaderboard
  const estimatedRank = useMemo(() => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return null;
    const num = Number(amount);
    const list = allProducts?.data || [];
    if (!list.length) return 1;

    let rank = 1;
    for (let i = 0; i < list.length; i++) {
      if (num > (list[i].currentAmount || 0)) {
        break;
      }
      rank++;
    }
    return rank;
  }, [amount, allProducts]);

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidUrl(url)) {
      toast.error("Please enter a valid website URL or domain (e.g. websitename.com)");
      return;
    }
    if (!categoryId) {
      toast.error("Please choose a category for your product");
      return;
    }
    if (!isValidAmount(amount)) {
      toast.error("Please enter a valid amount in INR (minimum ₹1)");
      return;
    }

    const cleanUrl = formatUrlInput(url);

    setLoading(true);
    setLoadingStep("Securing your spot on the board...");

    try {
      const order = await createOrder.mutateAsync({
        websiteUrl: cleanUrl,
        categoryId: Number(categoryId),
        amount: Number(amount),
      });

      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        setLoading(false);
        return;
      }

      setLoadingStep("Opening Razorpay Checkout...");

      const options = {
        key: order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: order.amount * 100,
        currency: order.currency || "INR",
        name: "TopRankPlots",
        description: `Rank product for ${formatINR(order.amount)}`,
        order_id: order.orderId,
        prefill: {
          name: "TopRankPlots Trader",
          email: "trader@toprankworld.lol",
          contact: "9999999999",
        },
        theme: {
          color: "#F05A38",
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "UPI (UPI ID, Google Pay, PhonePe, Paytm)",
                instruments: [
                  {
                    method: "upi",
                    flows: ["intent", "collect"],
                  },
                ],
              },
              other: {
                name: "Cards, NetBanking & Wallets",
                instruments: [
                  { method: "card" },
                  { method: "netbanking" },
                  { method: "wallet" },
                ],
              },
            },
            sequence: ["block.upi", "block.other"],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        handler: async (response) => {
          setLoading(true);
          setLoadingStep("Verifying payment and updating leaderboard...");
          try {
            const result = await verifyPayment.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            // Trigger celebratory success state
            setSuccessModal({
              product: result.product,
              oldRank: result.product.allTimeRank + 8,
              newRank: result.product.allTimeRank,
            });

            setUrl("");
            setCategoryId("");
            setAmount("");
          } catch {
            toast.error("Payment verification failed. Please contact support.");
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment could not be completed.");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err?.message || "Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <div
        id="submission-card"
        className="glass-panel p-5 sm:p-6 rounded-3xl shadow-feather-lg border border-border/80 dark:border-border/80 relative overflow-hidden"
      >
        {/* Subtle decorative background glow inside the command surface */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-coral/10 via-amber-500/5 to-transparent rounded-full filter blur-2xl pointer-events-none" />

        {/* Step Flow Indicators */}
        <div className="flex items-center justify-between gap-2 mb-4 text-[11px] text-muted border-b border-border/50 pb-3">
          <div className="flex items-center gap-1.5 font-medium text-coral">
            <span className="w-4 h-4 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>Step 1: Website URL</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-muted">
            <span className="w-4 h-4 rounded-full bg-surface-soft dark:bg-elevated flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            <span>Step 2: Category</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-muted">
            <span className="w-4 h-4 rounded-full bg-surface-soft dark:bg-elevated flex items-center justify-center text-[10px] font-bold">
              3
            </span>
            <span>Step 3: Spend</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Step 1: URL Input with Live Favicon Detection */}
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                {faviconUrl && !faviconError ? (
                  <img
                    src={faviconUrl}
                    alt="site favicon"
                    className="w-4 h-4 rounded object-contain"
                    onError={() => setFaviconError(true)}
                  />
                ) : (
                  <IconGlobe className="w-4 h-4 text-muted" />
                )}
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setFaviconError(false);
                }}
                placeholder="Paste your website URL (e.g. websitename.com or https://...)"
                required
                className="w-full pl-10 pr-4 py-3 bg-surface/90 dark:bg-surface/90 border border-border rounded-2xl text-charcoal dark:text-cream placeholder:text-muted/60 text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition-all shadow-sm"
              />
            </div>

            {/* Identified Site Pill Badge */}
            {detectedHost && detectedHost.includes(".") && (
              <div className="mt-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-surface-soft dark:bg-elevated border border-border/70 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2 min-w-0">
                  {faviconUrl && !faviconError ? (
                    <img
                      src={faviconUrl}
                      alt={detectedHost}
                      className="w-3.5 h-3.5 rounded object-contain flex-shrink-0"
                    />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                  <span className="text-muted text-[11px]">Identified site:</span>
                  <span className="font-semibold text-charcoal dark:text-white truncate">
                    {detectedHost}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 flex-shrink-0">
                  <IconCheck className="w-3 h-3" />
                  Ready to rank
                </span>
              </div>
            )}
          </div>

          {/* Step 2 & 3: Category and Amount Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Category Select */}
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1 px-1">
                Choose category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-surface/90 dark:bg-surface/90 border border-border rounded-xl text-charcoal dark:text-cream text-xs focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition-all shadow-sm cursor-pointer"
              >
                <option value="">Select a category</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.productCount || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div className="sm:col-span-6">
              <div className="flex items-center justify-between mb-1 px-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
                  Your amount (INR)
                </label>
                {estimatedRank && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
                    Est. position: ~#{estimatedRank}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal dark:text-cream font-mono font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount (e.g. 500)"
                  min="1"
                  step="1"
                  required
                  className="w-full pl-8 pr-3.5 py-2.5 bg-surface/90 dark:bg-surface/90 border border-border rounded-xl text-charcoal dark:text-cream font-mono font-semibold placeholder:text-muted/60 text-xs focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Ranking Hint if amount entered */}
          {amount && Number(amount) > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-coral/5 dark:bg-coral/10 border border-coral/20 text-xs">
              <span className="text-muted flex items-center gap-1.5">
                <IconTrendUp className="w-3.5 h-3.5 text-coral" />
                Higher spend = higher rank on the board
              </span>
              <span className="font-mono font-bold text-coral">
                {formatINR(amount)}
              </span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <IconShield className="w-3.5 h-3.5 text-coral" />
              <span>No minimum bid. You decide the amount.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-coral to-orange-500 hover:from-coral-hover hover:to-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-feather-coral hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <span>{loading ? loadingStep || "Preparing..." : "GO TOP"}</span>
              <IconArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </form>
      </div>

      {/* Post-Payment "You're Live" Celebration Modal */}
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
              Payment Confirmed
            </span>

            <h2 className="font-serif text-3xl font-bold text-charcoal dark:text-white mb-2">
              You&apos;re Live on the Board!
            </h2>

            <p className="text-sm text-muted mb-6">
              Your product is now publicly ranked based on your spend.
            </p>

            {/* Positional FLIP Rank Highlight */}
            <div className="flex items-center justify-center gap-4 py-4 px-6 rounded-2xl bg-surface-soft dark:bg-elevated border border-border/80 mb-6">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">
                  Category Rank
                </span>
                <span className="font-mono text-2xl font-black text-charcoal dark:text-white">
                  #{successModal.product.categoryRank || 1}
                </span>
              </div>

              <div className="h-8 w-px bg-border" />

              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">
                  Overall Board
                </span>
                <span className="font-mono text-2xl font-black text-coral">
                  #{successModal.product.allTimeRank || 1}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const pid = successModal.product.id;
                  setSuccessModal(null);
                  navigate(`/products/${pid}`);
                }}
                className="flex-1 px-4 py-3 bg-coral hover:bg-coral-hover text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-feather-coral transition-all"
              >
                View Product Page ↗
              </button>
              <button
                onClick={() => setSuccessModal(null)}
                className="px-5 py-3 border border-border rounded-xl text-xs font-semibold text-muted hover:text-charcoal dark:hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
