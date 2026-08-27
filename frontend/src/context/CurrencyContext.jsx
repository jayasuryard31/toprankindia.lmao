import { createContext, useContext, useState, useCallback, useMemo } from "react";
import {
  CURRENCIES,
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  setDisplayCurrency,
  currencySymbol,
  fromINR,
  toINR,
  formatINR,
  formatDisplay,
  formatCompact,
} from "../utils/formatINR";

const CurrencyContext = createContext(null);

function initialCode() {
  try {
    const saved = localStorage.getItem("tri-currency");
    if (saved && CURRENCIES[saved]) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_CURRENCY;
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    const code = initialCode();
    setDisplayCurrency(code); // sync the module-level helpers before first render
    return code;
  });

  const setCurrency = useCallback((code) => {
    if (!CURRENCIES[code]) return;
    setDisplayCurrency(code);
    try {
      localStorage.setItem("tri-currency", code);
    } catch {
      /* ignore */
    }
    setCurrencyState(code);
  }, []);

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      codes: CURRENCY_CODES,
      symbol: currencySymbol(currency),
      format: (inr) => formatINR(inr),
      formatDisplay: (v) => formatDisplay(v),
      formatCompact: (inr) => formatCompact(inr),
      fromINR: (inr) => fromINR(inr, currency),
      toINR: (v) => toINR(v, currency),
    }),
    [currency, setCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Safe fallback if used outside the provider.
    return {
      currency: DEFAULT_CURRENCY,
      setCurrency: () => {},
      codes: CURRENCY_CODES,
      symbol: currencySymbol(DEFAULT_CURRENCY),
      format: formatINR,
      formatDisplay,
      formatCompact,
      fromINR: (inr) => fromINR(inr, DEFAULT_CURRENCY),
      toINR: (v) => toINR(v, DEFAULT_CURRENCY),
    };
  }
  return ctx;
}
