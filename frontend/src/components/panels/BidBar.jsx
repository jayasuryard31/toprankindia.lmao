import { useState, useMemo } from "react";
import { useCategories } from "../../hooks/useCategories";
import { usePayment } from "../../hooks/usePayment";
import { useToast } from "../../context/ToastContext";
import { formatINR } from "../../utils/formatINR";
import { isValidUrl, isValidAmount, formatUrlInput, extractHostname, getFaviconUrl } from "../../utils/validation";
import { IconGlobe, IconShield, IconArrowUpRight, IconCheck } from "../common/Icons";

export default function BidBar({ onPaymentSuccess }) {
  const toast = useToast();
  const { data: categories } = useCategories();
  const { createOrder, verifyPayment } = usePayment();

  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

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
    if (!isValidAmount(amount)) {
      toast.error("Please enter a valid amount in INR (minimum ₹1)");
      return;
    }

    const cleanUrl = formatUrlInput(url);
    setLoading(true);

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

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: order.amount * 100,
        currency: order.currency || "INR",
        name: "TopRankIndia City",
        description: `Build skyline spot for ${formatINR(order.amount)}`,
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
            setAmount("");

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

          {/* Amount Input */}
          <div className="relative w-full md:w-36">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-muted">
              ₹
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              min="1"
              step="1"
              required
              className="w-full pl-7 pr-3 py-2 bg-surface/90 dark:bg-surface/90 border border-border/70 rounded-xl font-mono text-xs text-charcoal dark:text-cream placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-coral/30"
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

        {/* Microcopy & Detected Domain Bar */}
        <div className="flex items-center justify-between mt-1.5 px-2 text-[10px] text-muted">
          <div className="flex items-center gap-1">
            <IconShield className="w-3 h-3 text-coral" />
            <span>No minimum bid. You decide the height of your building.</span>
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

