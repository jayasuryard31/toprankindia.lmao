import { useState } from "react";
import { Link } from "react-router-dom";
import { usePayment } from "../../hooks/usePayment";
import { useToast } from "../../context/ToastContext";
import { formatINR } from "../../utils/formatINR";
import { trackClick } from "../../services/productsApi";
import { isValidAmount } from "../../utils/validation";
import LogoFallback from "../common/LogoFallback";
import Modal from "../common/Modal";
import {
  IconX,
  IconArrowUpRight,
  IconZap,
  IconShield,
} from "../common/Icons";

export default function BuildingPreview({ product, onClose, onOutbidSuccess }) {
  const toast = useToast();
  const { createOrder, verifyPayment } = usePayment();

  const [outbidOpen, setOutbidOpen] = useState(false);
  const [outbidAmount, setOutbidAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!product) return null;

  const handleVisit = async () => {
    if (!product?.websiteUrl) return;
    try {
      await trackClick(product.id);
    } catch {
      // ignore click tracking errors
    }
    window.open(product.websiteUrl, "_blank", "noopener,noreferrer");
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

  const handleOutbidSubmit = async (e) => {
    e.preventDefault();
    if (!isValidAmount(outbidAmount)) {
      toast.error("Please enter a valid amount in INR (minimum ₹1)");
      return;
    }

    setLoading(true);
    try {
      const order = await createOrder.mutateAsync({
        websiteUrl: product.websiteUrl,
        categoryId: product.category?.id || 15,
        amount: Number(outbidAmount),
      });

      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        setLoading(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: order.amount * 100,
        currency: order.currency || "INR",
        name: "TopRankIndia City",
        description: `Boost ${product.websiteName} to ${formatINR(order.amount)}`,
        order_id: order.orderId,
        handler: async (response) => {
          setLoading(true);
          try {
            const result = await verifyPayment.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            toast.success("Tower upgraded to new height!");
            setOutbidOpen(false);
            setOutbidAmount("");
            if (onOutbidSuccess && result.product) {
              onOutbidSuccess(result.product);
            }
          } catch {
            toast.error("Payment verification failed.");
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment was cancelled or failed.");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err?.message || "Failed to create order.");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="absolute top-20 left-4 md:left-6 z-30 w-80 sm:w-96 glass-panel p-5 rounded-3xl shadow-feather-lg border border-border/80 animate-in fade-in slide-in-from-left-4 duration-200">
        {/* Header with Close button */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {product.district || "Metropolis Landmark"}
            </span>
            {product.plotNumber && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-coral/10 text-coral border border-coral/20">
                {product.plotNumber}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-charcoal dark:hover:text-white bg-surface-soft dark:bg-elevated transition-colors cursor-pointer"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Product Identity */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="relative flex-shrink-0">
            {product.logoUrl ? (
              <img
                src={product.logoUrl}
                alt={product.websiteName}
                className="w-14 h-14 rounded-2xl object-cover border border-border/80 shadow-sm"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <LogoFallback
              name={product.websiteName}
              className={`w-14 h-14 rounded-2xl text-lg font-bold shadow-sm ${
                product.logoUrl ? "hidden" : "flex"
              }`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg font-bold text-charcoal dark:text-white truncate">
              {product.websiteName}
            </h3>
            <p className="text-xs text-muted line-clamp-2 mt-0.5 leading-relaxed">
              {product.description || product.websiteUrl}
            </p>
          </div>
        </div>

        {/* Category Badge & Ranks */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-surface-soft dark:bg-elevated border border-border/60 text-center">
            <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">
              Category Rank
            </span>
            <span className="font-mono text-base font-bold text-charcoal dark:text-white">
              #{product.categoryRank || 1}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-soft dark:bg-elevated border border-border/60 text-center">
            <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">
              City Rank
            </span>
            <span className="font-mono text-base font-black text-coral">
              #{product.allTimeRank || product.rank || 1}
            </span>
          </div>
        </div>

        {/* Spend Value */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-soft dark:bg-elevated border border-border/60 mb-4">
          <span className="text-xs text-muted font-medium">Tower Value</span>
          <span className="font-mono text-lg font-black text-coral">
            {formatINR(product.currentAmount)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleVisit}
            className="w-full py-2.5 px-4 bg-coral hover:bg-coral-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-feather-coral hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Visit Website</span>
            <IconArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOutbidOpen(true)}
              className="py-2 px-3 bg-surface dark:bg-surface border border-border hover:border-coral/40 text-charcoal dark:text-cream hover:text-coral rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <IconZap className="w-3.5 h-3.5 text-coral" />
              <span>Outbid</span>
            </button>

            <Link
              to={`/products/${product.id}`}
              className="py-2 px-3 bg-surface dark:bg-surface border border-border hover:border-coral/40 text-muted hover:text-charcoal dark:hover:text-white rounded-xl text-xs font-semibold text-center shadow-sm transition-all"
            >
              Full Profile ↗
            </Link>
          </div>
        </div>
      </div>

      {/* Outbid Dialog */}
      <Modal
        isOpen={outbidOpen}
        onClose={() => setOutbidOpen(false)}
        maxWidth="max-w-sm"
      >
        <div className="p-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 rounded-lg bg-coral/10 text-coral">
              <IconZap className="w-4 h-4" />
            </span>
            <h2 className="font-serif text-xl font-bold text-charcoal dark:text-white">
              Upgrade Tower Height
            </h2>
          </div>

          <p className="text-xs text-muted mb-4">
            Increase {product.websiteName}&apos;s rank and scale in the city.
          </p>

          <form onSubmit={handleOutbidSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                Your Amount (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-charcoal dark:text-cream">
                  ₹
                </span>
                <input
                  type="number"
                  value={outbidAmount}
                  onChange={(e) => setOutbidAmount(e.target.value)}
                  placeholder="Enter amount (e.g. 1000)"
                  min="1"
                  step="1"
                  required
                  autoFocus
                  className="w-full pl-8 pr-3 py-2.5 bg-surface dark:bg-surface border border-border rounded-xl text-charcoal dark:text-cream font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-coral/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-muted">
              <IconShield className="w-3.5 h-3.5 text-coral" />
              <span>No minimum requirement. Any positive amount.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-coral to-orange-500 hover:from-coral-hover hover:to-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-feather-coral transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Processing..." : "PAY VIA RAZORPAY →"}
            </button>
          </form>
        </div>
      </Modal>
    </>
  );
}

