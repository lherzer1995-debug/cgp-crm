/** Terminal-Objekt wie im JSON-Array gespeichert */
export interface Terminal {
  type: string;
  count: number;
  status: "active" | "inactive" | "defect";
}

/** Berechnet das Vertragsende aus Startdatum + Laufzeit in Monaten */
export function calculateContractEnd(startDate: string, monthsDuration: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + monthsDuration);
  return d.toISOString().split("T")[0];
}

/** Berechnet den Kündigungsstichtag: Vertragsende minus Kündigungsfrist */
export function calculateCancellationDeadline(endDate: string, noticeDays: number): string {
  const d = new Date(endDate);
  d.setDate(d.getDate() - noticeDays);
  return d.toISOString().split("T")[0];
}

/** Tage bis zum Vertragsende (negativ = abgelaufen) */
export function getDaysUntilEnd(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(endDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Ampelfarbe für Vertragsende */
export function getContractStatusColor(daysLeft: number): "green" | "yellow" | "red" | "gray" {
  if (daysLeft < 0) return "gray";
  if (daysLeft < 60) return "red";
  if (daysLeft < 90) return "yellow";
  return "green";
}

/** Tailwind-Klassen für Ampelfarbe */
export function getContractStatusClass(daysLeft: number): string {
  const color = getContractStatusColor(daysLeft);
  switch (color) {
    case "red":    return "text-red-600 dark:text-red-400";
    case "yellow": return "text-amber-600 dark:text-amber-400";
    case "green":  return "text-green-600 dark:text-green-400";
    default:       return "text-muted-foreground";
  }
}

/** Hintergrundfarbe für Badge */
export function getContractStatusBg(daysLeft: number): string {
  const color = getContractStatusColor(daysLeft);
  switch (color) {
    case "red":    return "bg-red-50 dark:bg-red-950/30 border-red-200/60 dark:border-red-800/40";
    case "yellow": return "bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40";
    case "green":  return "bg-green-50 dark:bg-green-950/30 border-green-200/60 dark:border-green-800/40";
    default:       return "bg-muted/40 border-border";
  }
}

/** Parst das terminals-JSON-Feld sicher */
export function parseTerminals(raw: string | null | undefined): Terminal[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Terminal[];
  } catch {
    return [];
  }
}

/** Formatiert Terminal-Info als lesbaren String */
export function formatTerminal(terminal: Terminal): string {
  const statusLabel: Record<string, string> = {
    active: "Aktiv",
    inactive: "Inaktiv",
    defect: "Defekt",
  };
  return `${terminal.count}× ${terminal.type} (${statusLabel[terminal.status] ?? terminal.status})`;
}

/** Status-Label auf Deutsch */
export function terminalStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Aktiv",
    inactive: "Inaktiv",
    defect: "Defekt",
  };
  return map[status] ?? status;
}

/** Status-Farbe für Terminal */
export function terminalStatusClass(status: string): string {
  switch (status) {
    case "active":   return "text-green-600 dark:text-green-400";
    case "inactive": return "text-muted-foreground";
    case "defect":   return "text-red-600 dark:text-red-400";
    default:         return "text-muted-foreground";
  }
}
