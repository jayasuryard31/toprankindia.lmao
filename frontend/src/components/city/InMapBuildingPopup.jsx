import { useState } from "react";
import { Link } from "react-router-dom";
import { useProducts } from "../../hooks/useProducts";
import { usePayment } from "../../hooks/usePayment";
import { useToast } from "../../context/ToastContext";
import { useCurrency } from "../../context/CurrencyContext";
import { formatINR } from "../../utils/formatINR";
import { trackClick } from "../../services/productsApi";
import LogoFallback from "../common/LogoFallback";
import Modal from "../common/Modal";
import { IconX, IconArrowUpRight, IconZap, IconShield, IconSparkle } from "../common/Icons";

export default function InMapBuildingPopup({
  building,
  screenPos,
  onClose,
  onOutbidSuccess,
}) {
  const toast = useToast();
  const { createOrder, verifyPayment } = usePayment();
  const { symbol, currency, fromINR, toINR, format } = useCurrency();

  // Determine top #1 product amount dynamically to claim rank 1
  const { data: topProductsData } = useProducts({
    limit: 1,
    sort: "rank",
    period: "all",
  });
  const top1Product = topProductsData?.data?.[0];
  const top1AmountINR = top1Product?.currentAmount ?? 4000;
  const claimAmount = Math.max(1, Math.ceil(fromINR(top1AmountINR)) + 1); // display currency

  const [outbidOpen, setOutbidOpen] = useState(false);
  const [userOutbid, setUserOutbid] = useState(null);
  const [loading, setLoading] = useState(false);
  const outbidAmount = userOutbid !== null ? userOutbid : String(claimAmount);
  const setOutbidAmount = setUserOutbid;

  if (!building || !screenPos) return null;

  const product = building.product || building;
  const overallRank = product.allTimeRank || product.rank || building.rank || 1;
  const categoryRank = product.categoryRank || 1;

  const handleVisit = async (e) => {
    e.stopPropagation();
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
    const amountINR = toINR(outbidAmount);
    if (!(Number(outbidAmount) > 0) || amountINR < 1) {
      toast.error(`Please enter a valid bid amount in ${currency}`);
      return;
    }

    setLoading(true);
    try {
      const order = await createOrder.mutateAsync({
        websiteUrl: product.websiteUrl,
        categoryId: product.category?.id || 15,
        amount: amountINR,
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
        name: "TopRankPlots Metropolis",
        description: `Boost ${product.websiteName} to ${format(order.amount)}`,
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
          try {
            const result = await verifyPayment.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            toast.success("Tower upgraded to new height!");
            setOutbidOpen(false);
            setUserOutbid(null);
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

  const winW = typeof window !== "undefined" ? window.innerWidth : 1000;
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;

  const rawX = screenPos?.x ?? winW / 2;
  const rawY = screenPos?.y ?? winH / 2;

  // Navbar height is 56px. Maintain strict safe margin below navbar.
  const NAVBAR_HEIGHT = 56;
  const TOP_SAFE_MARGIN = 16;
  const MIN_TOP = NAVBAR_HEIGHT + TOP_SAFE_MARGIN; // 72px
  const BOTTOM_SAFE_MARGIN = 20;

  const popupWidth = 330;
  const halfW = popupWidth / 2;
  const posX = Math.max(halfW + 12, Math.min(winW - halfW - 12, rawX));

  const estimatedH = 360;
  const placeAbove = (rawY - estimatedH - 16) >= MIN_TOP;

  let posY;
  if (placeAbove) {
    posY = Math.max(MIN_TOP, rawY - 14 - estimatedH);
  } else {
    posY = Math.max(MIN_TOP, Math.min(winH - estimatedH - BOTTOM_SAFE_MARGIN, rawY + 16));
  }

  const arrowLeft = Math.max(24, Math.min(popupWidth - 24, rawX - posX + halfW));

  return (
    <>
      <div
        style={{
          left: `${posX}px`,
          top: `${posY}px`,
        }}
        onClick={(e) => e.stopPropagation()}
        className="absolute -translate-x-1/2 z-40 w-76 sm:w-84 max-w-[calc(100vw-24px)] max-h-[calc(100vh-88px)] overflow-y-auto glass-panel p-4 rounded-3xl shadow-feather-lg border border-border text-xs animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0"
              style={{ backgroundColor: building.theme?.pin || "#0284C7" }}
            >
              #{building.rank}
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-coral/10 text-coral border border-coral/20 truncate">
              {product.plotNumber || `PLOT-${building.rank}`}
            </span>
            {building.rank === 1 && <span className="text-sm">👑</span>}
          </div>

          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-charcoal dark:hover:text-white bg-surface-soft dark:bg-elevated transition-colors cursor-pointer"
            title="Close"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Product Identity */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-surface-soft dark:bg-elevated flex-shrink-0 flex items-center justify-center border border-border">
            <LogoFallback
              src={product.logoUrl || product.faviconUrl}
              name={product.websiteName}
              size={44}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-charcoal dark:text-cream truncate">
              {product.websiteName}
            </h4>
            <span className="text-[11px] text-muted block truncate">
              {product.category?.name || "General"} · {product.district || "Velora Harbor"}
            </span>
          </div>
        </div>

        {/* Rank & Stats Triple Matrix */}
        <div className="grid grid-cols-3 gap-1.5 p-2 rounded-2xl bg-surface-soft/80 dark:bg-elevated/80 border border-border/60 mb-3 text-center">
          <div>
            <span className="text-[9px] text-muted uppercase font-bold block mb-0.5">Overall</span>
            <span className="font-mono text-xs font-black text-coral">
              #{overallRank}
            </span>
          </div>
          <div className="border-x border-border/50 px-1">
            <span className="text-[9px] text-muted uppercase font-bold block mb-0.5">Category</span>
            <span className="font-mono text-xs font-bold text-charcoal dark:text-white">
              #{categoryRank}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-muted uppercase font-bold block mb-0.5">Bid Value</span>
            <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 truncate block">
              {formatINR(product.currentAmount || 0)}
            </span>
          </div>
        </div>

        {/* Action Buttons: Outbid, Visit & Details */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setUserOutbid(null);
                setOutbidOpen(true);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-coral hover:bg-coral-dark text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <IconZap className="w-3.5 h-3.5" />
              <span>Outbid / Boost</span>
            </button>

            <button
              onClick={handleVisit}
              className="py-2 px-3 rounded-xl bg-surface dark:bg-surface border border-border hover:bg-surface-soft text-charcoal dark:text-cream font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Visit Website"
            >
              <span>Visit</span>
              <IconArrowUpRight className="w-3.5 h-3.5 text-muted" />
            </button>
          </div>

          {/* Details Link Button */}
          <Link
            to={`/products/${product.id}`}
            className="w-full py-1.5 px-3 rounded-xl bg-surface dark:bg-surface border border-border/80 hover:border-coral/40 text-muted hover:text-charcoal dark:hover:text-white font-semibold text-[11px] text-center shadow-xs transition-colors flex items-center justify-center gap-1"
          >
            <IconSparkle className="w-3 h-3 text-coral" />
            <span>View Full Details & Analytics ↗</span>
          </Link>
        </div>

        {/* Anchor Arrow pointing to building */}
        {placeAbove ? (
          <div
            style={{ left: `${arrowLeft}px` }}
            className="absolute -bottom-2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white/90 dark:border-t-[#1E1B18]/90"
          />
        ) : (
          <div
            style={{ left: `${arrowLeft}px` }}
            className="absolute -top-2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white/90 dark:border-b-[#1E1B18]/90"
          />
        )}
      </div>

      {/* Outbid Checkout Modal */}
      <Modal
        isOpen={outbidOpen}
        onClose={() => setOutbidOpen(false)}
        title="Upgrade Landmark Tower"
      >
        <form onSubmit={handleOutbidSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-charcoal dark:text-cream">
                Bidding Amount ({currency})
              </label>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                👑 {symbol.trim()}{claimAmount.toLocaleString()} to claim #1
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-muted">
                {symbol.trim()}
              </span>
              <input
                type="number"
                min="1"
                step="1"
                value={outbidAmount}
                onChange={(e) => setOutbidAmount(e.target.value)}
                placeholder={String(claimAmount)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface-soft dark:bg-elevated border border-border focus:border-coral focus:outline-none font-mono text-sm font-bold"
                required
                autoFocus
              />
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              Enter any amount. Higher bids elevate your tower and push you to the top rank.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setOutbidAmount(String(claimAmount))}
              className="flex-1 min-w-[120px] py-1.5 text-xs font-mono font-bold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              👑 Claim #1 ({symbol.trim()}{claimAmount.toLocaleString()})
            </button>
            {[5, 25, 100].map((add) => (
              <button
                key={add}
                type="button"
                onClick={() => setOutbidAmount(String(Math.ceil(fromINR(product.currentAmount || 0)) + add))}
                className="px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-surface-soft dark:bg-elevated hover:bg-coral/10 hover:text-coral transition-colors"
              >
                +{add}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOutbidOpen(false)}
              className="py-2 px-4 rounded-xl border border-border text-xs font-semibold hover:bg-surface-soft"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-coral hover:bg-coral-dark text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <IconShield className="w-3.5 h-3.5" />
              <span>{loading ? "Processing..." : `Pay ${outbidAmount ? symbol.trim() + Number(outbidAmount).toLocaleString() : ""} & Boost`}</span>
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
