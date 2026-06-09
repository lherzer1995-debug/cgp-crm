import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Square, Calendar, ExternalLink, Activity, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import CalendarWidget from "@/components/CalendarWidget";
import type { Activity as ActivityType, Customer } from "@shared/schema";

const ACT_TYPES: Record<string, string> = {
  call: "Anruf", follow_up: "Follow-up", meeting: "Meeting", email: "E-Mail",
};
const ACT_CLASS: Record<string, string> = {
  call: "act-call", follow_up: "act-follow_up",
  meeting: "text-indigo-600 dark:text-indigo-400", email: "text-cyan-600 dark:text-cyan-400",
};

function getGroup(dueDate?: string | null): "overdue" | "today" | "week" | "later" | "none" {
  if (!dueDate) return "none";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "week";
  return "later";
}

const GROUP_CONFIG = {
  overdue: { label: "Überfällig", color: "text-destructive", dot: "bg-destructive" },
  today:   { label: "Heute",      color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  week:    { label: "Diese Woche", color: "text-primary", dot: "bg-primary" },
  later:   { label: "Später",     color: "text-muted-foreground", dot: "bg-muted-foreground" },
  none:    { label: "Kein Datum", color: "text-muted-foreground", dot: "bg-muted-foreground/40" },
};

export default function ActivitiesPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { data: activities = [], isLoading: aLoad } = useQuery<ActivityType[]>({ queryKey: ["/api/activities"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const custMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      apiRequest("PATCH", `/api/activities/${id}`, { done }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/activities"] }),
  });

  const allPending = activities
    .filter((a) => !a.done)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate > b.dueDate ? 1 : -1;
    });

  const pending = selectedDate
    ? allPending.filter((a) => a.dueDate?.slice(0, 10) === selectedDate)
    : allPending;

  const done = activities
    .filter((a) => a.done && (!selectedDate || a.dueDate?.slice(0, 10) === selectedDate))
    .sort((a, b) => ((b.createdAt ?? "") > (a.createdAt ?? "") ? 1 : -1));

  // Gruppieren
  const groups: Record<string, ActivityType[]> = { overdue: [], today: [], week: [], later: [], none: [] };
  pending.forEach((a) => groups[getGroup(a.dueDate)].push(a));

  function ActivityRow({ a }: { a: ActivityType }) {
    const cust = custMap[a.customerId];
    const group = getGroup(a.dueDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = a.dueDate ? new Date(a.dueDate) : null;
    const diff = due ? Math.round((due.setHours(0,0,0,0), due.getTime() - today.getTime()) / 86400000) : null;

    let dateStr = "";
    if (a.dueDate) {
      if (diff === 0) dateStr = "Heute";
      else if (diff === 1) dateStr = "Morgen";
      else if (diff === -1) dateStr = "Gestern";
      else dateStr = new Date(a.dueDate).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" });
      if (a.dueTime) dateStr += ` · ${a.dueTime} Uhr`;
    }

    return (
      <Card className={cn("transition-all", a.done && "opacity-50")}>
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Color stripe per group */}
            <div className={cn("w-1 rounded-l-lg shrink-0",
              a.done ? "bg-muted" :
              group === "overdue" ? "bg-destructive" :
              group === "today" ? "bg-amber-400" :
              group === "week" ? "bg-primary" : "bg-muted-foreground/30"
            )} />
            <div className="flex items-center gap-3 px-3 py-3 flex-1 min-w-0">
              <button
                onClick={() => toggle.mutate({ id: a.id, done: !a.done })}
                className="shrink-0 text-muted-foreground hover:text-green-500 transition-colors"
              >
                {a.done
                  ? <CheckSquare className="w-5 h-5 text-green-500" />
                  : <Square className="w-5 h-5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wide shrink-0", ACT_CLASS[a.type] ?? "text-muted-foreground")}>
                    {ACT_TYPES[a.type] ?? a.type}
                  </span>
                  {cust && (
                    <span className="text-[11px] text-muted-foreground font-semibold">{cust.companyName}</span>
                  )}
                  {a.calendarEventId && (
                    <CalendarCheck className="w-3 h-3 text-green-500 shrink-0" title="Im Google Kalender" />
                  )}
                </div>
                <p className={cn("text-sm text-foreground mt-0.5 truncate", a.done && "line-through text-muted-foreground")}>
                  {a.description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {dateStr && (
                  <div className={cn(
                    "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full",
                    a.done ? "text-muted-foreground bg-muted/50" :
                    group === "overdue" ? "text-destructive bg-destructive/10" :
                    group === "today" ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40" :
                    "text-muted-foreground bg-muted/50"
                  )}>
                    <Calendar className="w-3 h-3" />
                    {dateStr}
                  </div>
                )}
                {cust && (
                  <Link href={`/customers/${cust.id}`}>
                    <a>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-3">
        <div className="w-1 h-10 rounded-full bg-[#FFD100] shrink-0 mt-0.5" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Aktivitäten</h1>
          <p className="text-sm text-muted-foreground">
            {allPending.length > 0 ? `${allPending.length} offen` : "Alles erledigt"}{done.length > 0 ? ` · ${done.length} erledigt` : ""}
            {selectedDate ? ` · Gefiltert: ${new Date(selectedDate + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}` : ""}
          </p>
        </div>
      </div>

      {/* Calendar Widget */}
      <div className="max-w-xs">
        <CalendarWidget
          activities={activities}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {aLoad ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Noch keine Aufgaben</p>
          <p className="text-xs mt-1">Füge Aktivitäten über die Kundendetailseite hinzu</p>
        </div>
      ) : (
        <>
          {/* Gruppierte offene Aufgaben */}
          {(["overdue", "today", "week", "later", "none"] as const).map((gKey) => {
            const group = groups[gKey];
            if (group.length === 0) return null;
            const cfg = GROUP_CONFIG[gKey];
            return (
              <div key={gKey} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                  <p className={cn("text-xs font-bold uppercase tracking-widest", cfg.color)}>
                    {cfg.label} ({group.length})
                  </p>
                </div>
                {group.map((a) => <ActivityRow key={a.id} a={a} />)}
              </div>
            );
          })}

          {/* Erledigte */}
          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                Erledigt ({done.length})
              </p>
              {done.slice(0, 10).map((a) => <ActivityRow key={a.id} a={a} />)}
              {done.length > 10 && (
                <p className="text-xs text-center text-muted-foreground py-2">+ {done.length - 10} weitere</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
