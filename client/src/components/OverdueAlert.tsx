import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity } from "@shared/schema";

/**
 * Sticky banner shown at the top of every page when there are overdue tasks.
 * Clicking the banner navigates to /tasks?filter=overdue.
 * The user can dismiss it for the current session.
 */
export default function OverdueAlert() {
  const [dismissed, setDismissed] = useState(false);

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueCount = activities.filter((a) => {
    if (a.done || !a.dueDate) return false;
    const due = new Date(a.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  if (overdueCount === 0 || dismissed) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 bg-destructive/10 border-b border-destructive/20",
        "text-destructive text-sm font-medium"
      )}
      role="alert"
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />

      <span className="flex-1">
        {overdueCount === 1
          ? "1 Aufgabe ist überfällig."
          : `${overdueCount} Aufgaben sind überfällig.`}
      </span>

      <Link href="/tasks?filter=overdue">
        <a className="flex items-center gap-1 text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity shrink-0">
          Jetzt ansehen
          <ArrowRight className="w-3 h-3" />
        </a>
      </Link>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Benachrichtigung schließen"
        className="shrink-0 hover:opacity-70 transition-opacity ml-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
