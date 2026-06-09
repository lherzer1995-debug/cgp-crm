/**
 * Client-side risk scoring helpers.
 * The actual score calculation is done server-side.
 * These helpers are for display/formatting.
 */

export type RiskCategory = "green" | "yellow" | "red";

export interface RiskInfo {
  category: RiskCategory;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

/**
 * Returns display info for a risk score (0-100).
 */
export function getRiskInfo(score: number): RiskInfo {
  if (score >= 61) {
    return {
      category: "red",
      label: "Hohes Risiko",
      color: "#ef4444",
      bgColor: "bg-red-50 dark:bg-red-950/20",
      borderColor: "border-red-200 dark:border-red-800/40",
      textColor: "text-red-600 dark:text-red-400",
    };
  }
  if (score >= 31) {
    return {
      category: "yellow",
      label: "Mittleres Risiko",
      color: "#f59e0b",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      borderColor: "border-amber-200 dark:border-amber-800/40",
      textColor: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    category: "green",
    label: "Sicher",
    color: "#22c55e",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800/40",
    textColor: "text-green-600 dark:text-green-400",
  };
}

/**
 * Returns a short badge label for a risk score.
 */
export function getRiskBadgeLabel(score: number): string {
  if (score >= 61) return `⚠ ${score}`;
  if (score >= 31) return `~ ${score}`;
  return `✓ ${score}`;
}

/**
 * Returns the Tailwind badge classes for a risk score.
 */
export function getRiskBadgeClass(score: number): string {
  if (score >= 61) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/40";
  if (score >= 31) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40";
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/40";
}
