/**
 * Helpers for formatting and parsing KI briefings and forecasts.
 */

/**
 * Converts markdown-style briefing text to HTML for display.
 * Handles ## headings, **bold**, and bullet lists.
 */
export function formatBriefing(text: string): string {
  if (!text) return "";
  return text
    // ## Headings
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-foreground mt-4 mb-2">$1</h2>')
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Bullet points
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm text-foreground">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="list-disc space-y-1 my-2">${match}</ul>`)
    // Line breaks
    .replace(/\n\n/g, '</p><p class="text-sm text-foreground mt-2">')
    .replace(/\n/g, "<br/>")
    // Wrap in paragraph
    .replace(/^(?!<)/, '<p class="text-sm text-foreground">')
    .replace(/(?<!>)$/, "</p>");
}

/**
 * Copies text to clipboard and returns success boolean.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  }
}

/**
 * Formats a forecast trend percentage with sign and arrow.
 */
export function formatTrend(percent: number): { label: string; arrow: string; className: string } {
  if (percent > 5) {
    return { label: `+${percent}%`, arrow: "↑", className: "text-green-600 dark:text-green-400" };
  }
  if (percent < -5) {
    return { label: `${percent}%`, arrow: "↓", className: "text-red-600 dark:text-red-400" };
  }
  return { label: `${percent > 0 ? "+" : ""}${percent}%`, arrow: "→", className: "text-amber-600 dark:text-amber-400" };
}
