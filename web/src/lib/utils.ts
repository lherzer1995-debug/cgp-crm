export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < -1) return `vor ${Math.abs(days)} Tagen`;
  if (days === -1) return "gestern";
  if (days === 0) return "heute";
  if (days === 1) return "morgen";
  if (days < 7) return `in ${days} Tagen`;
  return formatDate(date);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getPriorityColor(priority: number): string {
  if (priority >= 5) return "text-danger";
  if (priority >= 4) return "text-warning";
  if (priority >= 3) return "text-accent-400";
  return "text-white/30";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "badge-success";
    case "inactive": return "badge-ghost";
    case "churned": return "badge-danger";
    default: return "badge-ghost";
  }
}
