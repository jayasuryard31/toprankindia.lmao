import { useState, useMemo } from "react";
import { useCategories } from "../../hooks/useCategories";
import { usePayment } from "../../hooks/usePayment";
import { useToast } from "../../context/ToastContext";
import { useCurrency } from "../../context/CurrencyContext";
import { isValidUrl, formatUrlInput, extractHostname, getFaviconUrl } from "../../utils/validation";
import { IconX, IconGlobe, IconArrowUpRight, IconShield } from "../common/Icons";

const USD_PER_FLOOR = 5;

/**
 * Popup shown when a player clicks a vacant plot. Any plot can be acquired;
 * the bid amount decides the starting height ($200 = 1 floor).
 */
export default function PlotBidPopup({ plot, screenPos, onClose, onAcquire }) {
  const toast = useToast();
  const { data: categories } = useCategories();
  const { createOrder, verifyPayment } = usePayment();
  const { symbol, currency, toINR, fromINR, format } = useCurrency();

  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const isPrebuilt = !!plot?.isPrebuilt;
  const fixedRateUSD = plot?.fixedPriceUSD || (plot?.districtId?.includes("northpoint") ? 30 : 20);
  const fixedRateINR = plot?.fixedPriceINR || fixedRateUSD * 83;
  const minDisplayAmount = Math.max(1, Math.ceil(fromINR(fixedRateINR)));
  const [amount, setAmount] = useState(String(minDisplayAmount));
  const [loading, setLoading] = useState(false);

  const host = useMemo(() => extractHostname(url), [url]);
  const favicon = useMemo(
    () => (host && host.includes(".") ? getFaviconUrl(url) : ""),
    [host, url]
  );
  const floors = Math.max(1, Math.round((Number(amount) || 0) / (fromINR(USD_PER_FLOOR * 83) || 1)));

  if (!plot || !screenPos) return null;

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidUrl(url)) return toast.error("Enter a valid website URL (e.g. websitename.com)");
    if (!categoryId) return toast.error("Choose a category");
    const amountINR = toINR(amount);
    if (!(Number(amount) > 0) || amountINR < 1) return toast.error(`Enter a valid amount in ${currency}`);

    const cleanUrl = formatUrlInput(url);
    setLoading(true);
    try {
      const order = await createOrder.mutateAsync({
        websiteUrl: cleanUrl,
        categoryId: Number(categoryId),
        amount: amountINR,
      });
      if (!(await loadRazorpay())) {
        toast.error("Failed to load payment gateway");
        setLoading(false);
        return;
      }
      const options = {
        key: order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: order.amount * 100,
        currency: order.currency || "INR",
        name: "TopRankPlots Metropolis",
        description: `Acquire ${plot.plotNumber} - ${format(order.amount)}`,
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
            const acquiredProduct = result?.product || {
              id: Date.now(),
              websiteUrl: cleanUrl,
              websiteName: host || cleanUrl,
              currentAmount: amountINR,
              categoryId: Number(categoryId),
              plotLng: plot.worldX,
              plotLat: plot.worldZ,
            };
            toast.success(`${plot.plotNumber} acquired - your building is rising!`);
            onAcquire?.(acquiredProduct, plot.worldX, plot.worldZ);
            onClose?.();
          } catch {
            toast.error("Payment verification failed.");
          }
          setLoading(false);
        },
        modal: { ondismiss: () => setLoading(false) },
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

  const popupWidth = 320;
  const halfW = popupWidth / 2;
  const posX = Math.max(halfW + 12, Math.min(winW - halfW - 12, rawX));

  const estimatedH = 430;
  const placeAbove = (rawY - estimatedH - 16) >= MIN_TOP;

  let posY;
  if (placeAbove) {
    posY = Math.max(MIN_TOP, rawY - 14 - estimatedH);
  } else {
    posY = Math.max(MIN_TOP, Math.min(winH - estimatedH - BOTTOM_SAFE_MARGIN, rawY + 16));
  }

  const arrowLeft = Math.max(24, Math.min(popupWidth - 24, rawX - posX + halfW));

  return (
    <div
      style={{ left: `${posX}px`, top: `${posY}px` }}
      onClick={(e) => e.stopPropagation()}
      className="absolute -translate-x-1/2 z-40 w-80 max-w-[calc(100vw-24px)] max-h-[calc(100vh-88px)] overflow-y-auto glass-panel p-4 rounded-3xl shadow-feather-lg border border-border text-xs animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0"
            style={{ backgroundColor: plot.color || "#0284C7" }}
          >
            {plot.plotNumber}
          </span>
          <span className="text-[11px] text-muted truncate">{plot.districtName}</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-charcoal dark:hover:text-white bg-surface-soft dark:bg-elevated transition-colors cursor-pointer"
          title="Close"
        >
          <IconX className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fixed Base Rate Banner */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-surface-soft/80 dark:bg-elevated/80 border border-border/60 mb-3">
        <span className="text-[11px] font-bold text-charcoal/80 dark:text-cream/80">
          Plot Fixed Base Rate:
        </span>
        <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          ${fixedRateUSD} ({format(fixedRateINR)})
        </span>
      </div>

      <p className="text-[11px] text-muted mb-3">
        {plot.taken
          ? "This plot is occupied - outbid its owner from their building to take it over."
          : `Acquire ${plot.plotNumber || "this plot"} with a fixed base rate of $${fixedRateUSD}. Your investment raises your brand's permanent skyscraper!`}
      </p>

      {!plot.taken && (
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {favicon ? (
                <img src={favicon} alt="" className="w-4 h-4 rounded object-contain" />
              ) : (
                <IconGlobe className="w-4 h-4 text-muted" />
              )}
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Website URL (e.g. websitename.com)"
              required
              className="w-full pl-9 pr-3 py-2 bg-surface/90 border border-border/70 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-coral/30"
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full px-3 py-2 bg-surface/90 border border-border/70 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-coral/30 cursor-pointer"
          >
            <option value="">Select Category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-muted">
              {symbol.trim()}
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              readOnly={isPrebuilt}
              onChange={(e) => !isPrebuilt && setAmount(e.target.value)}
              required
              className="w-full pl-7 pr-3 py-2 bg-surface/90 border border-border/70 rounded-xl font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-coral/30"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted px-0.5">
            <span>
              {isPrebuilt
                ? "Fixed price · buy as-is"
                : `~${symbol.trim()}${Math.round(fromINR(USD_PER_FLOOR * 83)).toLocaleString()} / floor`}
            </span>
            <span className="font-bold text-coral">≈ {floors} floor{floors > 1 ? "s" : ""}</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-coral hover:bg-coral-dark text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <IconShield className="w-3.5 h-3.5" />
            <span>{loading ? "Processing…" : "Acquire Plot"}</span>
            <IconArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

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
  );
}
