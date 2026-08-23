/** Currency and number formatting. Everything in INR, Indian digit grouping. */

const grouper = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function indianDigits(n: number, dp = 0): string {
  if (!isFinite(n)) return "0";
  if (dp === 0) return grouper.format(Math.round(n));
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);
}

/** Rupees to a Lakh / Crore string, for example 1,34,40,000 -> "₹1.34 Cr". */
export function inr(rupees: number): string {
  const abs = Math.abs(rupees);
  if (abs >= 1e7) return `₹${indianDigits(rupees / 1e7, 2)} Cr`;
  if (abs >= 1e5) return `₹${indianDigits(rupees / 1e5, 2)} L`;
  return `₹${indianDigits(rupees)}`;
}

/** Amounts held in the engine as INR Lakh. */
export function inrLakh(lakh: number): string {
  return inr(lakh * 1e5);
}

export function inrPlain(rupees: number, dp = 0): string {
  return `₹${indianDigits(rupees, dp)}`;
}

export function num(n: number, dp = 0): string {
  return indianDigits(n, dp);
}
