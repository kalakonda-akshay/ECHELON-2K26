import type { RiskLevel } from "./types";

export const riskLabels: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Moderate",
  high: "High",
};

/** Hex values mirroring the --risk-* CSS variables, for contexts (Leaflet, recharts)
 *  that need a literal color string rather than a Tailwind class. */
export const riskHex: Record<RiskLevel, string> = {
  low: "#2f7d54",
  medium: "#b5790f",
  high: "#b33626",
};

export const riskFillHex: Record<RiskLevel, string> = {
  low: "#2f7d5433",
  medium: "#b5790f33",
  high: "#b3362633",
};

export function riskBadgeVariant(level: RiskLevel): "low" | "medium" | "high" {
  return level;
}

export const plainLanguage: Record<RiskLevel, { headline: string; body: string }> = {
  low: {
    headline: "This area shows low radon risk.",
    body: "Readings here are typically well within safe limits. No immediate action is needed, but it's still good practice to test every few years.",
  },
  medium: {
    headline: "This area shows moderate radon risk.",
    body: "Some homes nearby have measurable radon levels. Testing your home and improving ventilation can lower any risk further.",
  },
  high: {
    headline: "This area shows high radon risk.",
    body: "Homes in this area have shown elevated radon readings. We recommend getting your home tested soon and contacting your municipal health office for guidance.",
  },
};
