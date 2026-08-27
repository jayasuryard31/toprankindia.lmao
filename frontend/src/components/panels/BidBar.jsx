import { useState, useMemo } from "react";
import { useCategories } from "../../hooks/useCategories";
import { useProducts } from "../../hooks/useProducts";
import { usePayment } from "../../hooks/usePayment";
import { useToast } from "../../context/ToastContext";
import { useCurrency } from "../../context/CurrencyContext";
import { isValidUrl, formatUrlInput, extractHostname, getFaviconUrl } from "../../utils/validation";
import { IconGlobe, IconArrowUpRight, IconCheck } from "../common/Icons";

export default function BidBar({ onPaymentSuccess }) {
  const toast = useToast();
  const { data: categories } = useCategories();
  const { createOrder, verifyPayment } = usePayment();
  const { symbol, currency, fromINR, toINR, format } = useCurrency();

  // Analyze the #1 top product to determine the exact bid required to earn Rank #1
  const { data: topProductsData } = useProducts({
    limit: 1,
    sort: "rank",
    period: "all",
  });

  const top1Product = topProductsData?.data?.[0];
  const top1AmountINR = top1Product?.currentAmount ?? 4000;
  // Smallest bid (in the display currency) that beats the current #1.
  const claimAmount = Math.max(1, Math.ceil(fromINR(top1AmountINR)) + 1);

  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [userAmount, setUserAmount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const amount = userAmount !== null ? userAmount : String(claimAmount);

  const detectedHost = useMemo(() => extractHostname(url), [url]);
  const faviconUrl = useMemo(() => {
    if (!detectedHost || !detectedHost.includes(".")) return "";
    return getFaviconUrl(url);
  }, [detectedHost, url]);

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
      toast.error("Please enter a valid website URL or domain (e.g. vegaedu.in)");
      return;
    }
    if (!categoryId) {
      toast.error("Please choose a category for your building");
      return;
    }
    const amountINR = toINR(amount);
    if (!(Number(amount) > 0) || amountINR < 1) {
      toast.error(`Please enter a valid bid amount in ${currency}`);
      return;
    }

    const cleanUrl = formatUrlInput(url);
    setLoading(true);

    try {
      const order = await createOrder.mutateAsync({
        websiteUrl: cleanUrl,
        categoryId: Number(categoryId),
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
        name: "TopRankIndia City",
        description: `Build skyline spot for ${format(order.amount)}`,
        order_id: order.orderId,
        handler: async (response) => {
          setLoading(true);
          try {
            const result = await verifyPayment.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            toast.success("Your building has risen in the city skyline!");
            setUrl("");
            setCategoryId("");
            setUserAmount(null);

            if (onPaymentSuccess && result.product) {
              onPaymentSuccess(result.product);
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
      toast.error(err?.message || "Failed to initiate order.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="glass-panel p-2.5 sm:p-3 rounded-2xl shadow-feather-lg border border-border/80 relative">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-2">
          {/* URL Input */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
              placeholder="Website URL (e.g. vegaedu.in)"
              required
              className="w-full pl-9 pr-3 py-2 bg-surface/90 dark:bg-surface/90 border border-border/70 rounded-xl text-xs text-charcoal dark:text-cream placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-coral/30"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-48">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-surface/90 dark:bg-surface/90 border border-border/70 rounded-xl text-xs text-charcoal dark:text-cream focus:outline-none focus:ring-2 focus:ring-coral/30 cursor-pointer"
            >
              <option value="">Select District</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input with Default #1 Winning Bid (e.g. 4001) */}
          <div className="relative w-full md:w-36">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-muted">
              {symbol.trim()}
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setUserAmount(e.target.value)}
              placeholder={String(claimAmount)}
              min="1"
              step="1"
              required
              className="w-full pl-7 pr-3 py-2 bg-surface/90 dark:bg-surface/90 border border-border/70 rounded-xl font-mono text-xs font-bold text-charcoal dark:text-cream placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-coral/30"
            />
          </div>

          {/* Place Bid CTA Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-5 py-2 bg-gradient-to-r from-coral to-orange-500 hover:from-coral-hover hover:to-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-feather-coral hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <span>{loading ? "Building..." : "Build Spot"}</span>
            <IconArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Microcopy with #1 Rank Target Info */}
        <div className="flex items-center justify-between mt-1.5 px-2 text-[10px] text-muted">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
              👑 {symbol.trim()}{claimAmount.toLocaleString()}
            </span>
            <span>to claim #1 Rank (editable · billed in {currency})</span>
          </div>

          {detectedHost && detectedHost.includes(".") && (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <IconCheck className="w-3 h-3" />
              <span>{detectedHost} ready to build</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
