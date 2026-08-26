export function formatINR(amount) {
  if (amount == null) return "₹0";
  const num = Number(amount);
  if (isNaN(num)) return "₹0";
  return "₹" + num.toLocaleString("en-IN");
}

export function formatCompact(amount) {
  if (amount == null) return "₹0";
  const num = Number(amount);
  if (num >= 10000000) return "₹" + (num / 10000000).toFixed(2) + "Cr";
  if (num >= 100000) return "₹" + (num / 100000).toFixed(2) + "L";
  if (num >= 1000) return "₹" + (num / 1000).toFixed(1) + "K";
  return "₹" + num.toLocaleString("en-IN");
}
