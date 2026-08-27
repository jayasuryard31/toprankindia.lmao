import { useCurrency } from "../../context/CurrencyContext";
import { CURRENCIES } from "../../utils/formatINR";

export default function CurrencySelector() {
  const { currency, setCurrency, codes } = useCurrency();

  return (
    <label
      className="flex items-center gap-1.5 h-9 pl-3 pr-2 rounded-2xl glass-panel shadow-feather-lg border border-border/80 text-xs font-bold text-charcoal dark:text-cream select-none pointer-events-auto cursor-pointer"
      title="Display currency"
    >
      <span className="text-coral">{CURRENCIES[currency]?.symbol.trim()}</span>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="bg-transparent focus:outline-none cursor-pointer pr-1 text-charcoal dark:text-cream"
      >
        {codes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
