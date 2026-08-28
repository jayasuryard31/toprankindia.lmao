/**
 * Money formatting. Amounts are stored server-side in INR (Razorpay), but the
 * UI shows a chosen display currency - USD by default. `CurrencyContext` calls
 * `setDisplayCurrency()` so the legacy `formatINR` / `formatCompact` helpers
 * used across the app switch automatically on the next render.
 */

// value of 1 unit of the currency, expressed in INR
export const CURRENCIES = {
  USD: { code: "USD", symbol: "$", inrPerUnit: 83, locale: "en-US" },
  INR: { code: "INR", symbol: "₹", inrPerUnit: 1, locale: "en-IN" },
  EUR: { code: "EUR", symbol: "€", inrPerUnit: 90, locale: "de-DE" },
  GBP: { code: "GBP", symbol: "£", inrPerUnit: 105, locale: "en-GB" },
  AED: { code: "AED", symbol: "AED ", inrPerUnit: 22.6, locale: "en-AE" },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES);
export const DEFAULT_CURRENCY = "USD";

let _code = DEFAULT_CURRENCY;

export function setDisplayCurrency(code) {
  if (CURRENCIES[code]) _code = code;
}
export function getDisplayCurrency() {
  return _code;
}
export function currencySymbol(code = _code) {
  return (CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY]).symbol;
}

/** INR (server) → display-currency number */
export function fromINR(inrAmount, code = _code) {
  const c = CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY];
  return Number(inrAmount || 0) / c.inrPerUnit;
}

/** display-currency number → INR integer (for the payment gateway) */
export function toINR(displayAmount, code = _code) {
  const c = CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY];
  return Math.max(0, Math.round(Number(displayAmount || 0) * c.inrPerUnit));
}

function fmt(value, code) {
  const c = CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY];
  const digits = Math.abs(value) < 100 && value % 1 !== 0 ? 2 : 0;
  return c.symbol + value.toLocaleString(c.locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** Format an INR (server) amount in the active display currency. */
export function formatINR(inrAmount) {
  if (inrAmount == null || isNaN(Number(inrAmount))) return currencySymbol() + "0";
  return fmt(fromINR(inrAmount), _code);
}

export const formatMoney = formatINR;

/** Format an amount that is ALREADY in the display currency. */
export function formatDisplay(amount) {
  return fmt(Number(amount || 0), _code);
}

export function formatCompact(inrAmount) {
  const c = CURRENCIES[_code] || CURRENCIES[DEFAULT_CURRENCY];
  const v = fromINR(inrAmount);
  if (v >= 1e9) return c.symbol + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return c.symbol + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return c.symbol + (v / 1e3).toFixed(1) + "K";
  return fmt(v, _code);
}
