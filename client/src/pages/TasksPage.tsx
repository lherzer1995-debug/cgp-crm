import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  Square,
  Calendar,
  ExternalLink,
  ListTodo,
  CalendarCheck,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity, Customer } from "@shared/schema";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACT_TYPES: Record<string, string> = {
  call: "Anruf",
  demo: "Demo",
  proposal: "Angebot",
  follow_up: "Follow-up",
  meeting: "Meeting",
  email: "E-Mail",
  closed_won: "Abschluss ✓",
  closed_lost: "Verloren",
};

const ACT_CLASS: Record<string, string> = {
  call: "act-call",
  demo: "act-demo",
  proposal: "act-proposal",
  follow_up: "act-follow_up",
  closed_won: "act-closed_won",
  closed_lost: "act-closed_lost",
  meeting: "text-indigo-600 dark:text-indigo-400",
  email: "text-cyan-600 dark:text-cyan-400",
};

type DateFilter = "all" | "overdue" | "today" | "week" | "later" | "none";
type StatusFilter = "open" | "done" | "all";

function getDateGroup(dueDate?: string | null): "overdue" | "today" | "week" | "later" | "none" {
  if (!dueDate) return "none";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "week";
  return "later";
}

const DATE_GROUP_CONFIG = {
  overdue: { label: "Überfällig", color: "text-destructive", dot: "bg-destructive", badge: "destructive" as const },
  today:   { label: "Heute",      color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", badge: "outline" as const },
  week:    { label: "Diese Woche", color: "text-primary", dot: "bg-primary", badge: "default" as const },
  later:   { label: "Später",     color: "text-muted-foreground", dot: "bg-muted-foreground", badge: "secondary" as const },
  none:    { label: "Kein Datum", color: "text-muted-foreground", dot: "bg-muted-foreground/40", badge: "secondary" as const },
};

// ── TasksPage ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  // Read ?filter=overdue from URL (set by OverdueAlert)
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const initialDateFilter = (urlParams.get("filter") as DateFilter) ?? "all";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [dateFilter, setDateFilter] = useState<DateFilter>(initialDateFilter);
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers]
  );

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      apiRequest("PATCH", `/api/activities/${id}`, { done }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/activities"] }),
  });

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...activities];

    // Status
    if (statusFilter === "open") list = list.filter((a) => !a.done);
    else if (statusFilter === "done") list = list.filter((a) => a.done);

    // Date group
    if (dateFilter !== "all") {
      list = list.filter((a) => getDateGroup(a.dueDate) === dateFilter);
    }

    // Customer
    if (customerFilter !== "all") {
      list = list.filter((a) => String(a.customerId) === customerFilter);
    }

    // Type
    if (typeFilter !== "all") {
      list = list.filter((a) => a.type === typeFilter);
    }

    // Sort: overdue first, then by dueDate asc, nulls last
    list.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    });

    return list;
  }, [activities, statusFilter, dateFilter, customerFilter, typeFilter]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdueCount = activities.filter((a) => {
    if (a.done || !a.dueDate) return false;
    const due = new Date(a.dueDate); due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;
  const openCount = activities.filter((a) => !a.done).length;

  const hasActiveFilters =
    statusFilter !== "open" || dateFilter !== "all" || customerFilter !== "all" || typeFilter !== "all";

  function clearFilters() {
    setStatusFilter("open");
    setDateFilter("all");
    setCustomerFilter("all");
    setTypeFilter("all");
  }

  // ── Unique types present in data ───────────────────────────────────────────
  const presentTypes = useMemo(
    () => [...new Set(activities.map((a) => a.type))].sort(),
    [activities]
  );

  // ── Row component ──────────────────────────────────────────────────────────
  function TaskRow({ a }: { a: Activity }) {
    const cust = custMap[a.customerId];
    const group = getDateGroup(a.dueDate);
    const todayMs = new Date(); todayMs.setHours(0, 0, 0, 0);
    const due = a.dueDate ? new Date(a.dueDate) : null;
    const diff = due
      ? Math.round((due.setHours(0, 0, 0, 0), due.getTime() - todayMs.getTime()) / 86400000)
      : null;

    let dateStr = "";
    if (a.dueDate) {
      if (diff === 0) dateStr = "Heute";
      else if (diff === 1) dateStr = "Morgen";
      else if (diff === -1) dateStr = "Gestern";
      else
        dateStr = new Date(a.dueDate).toLocaleDateString("de-DE", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        });
      if (a.dueTime) dateStr += ` · ${a.dueTime} Uhr`;
    }

    return (
      <Card className={cn("transition-all hover:shadow-sm", a.done && "opacity-50")}>
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Color stripe */}
            <div
              className={cn(
                "w-1 rounded-l-lg shrink-0",
                a.done
                  ? "bg-muted"
                  : group === "overdue"
                  ? "bg-destructive"
                  : group === "today"
                  ? "bg-amber-400"
                  : group === "week"
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              )}
            />

            <div className="flex items-center gap-3 px-3 py-3 flex-1 min-w-0">
              {/* Toggle done */}
              <button
                onClick={() => toggle.mutate({ id: a.id, done: !a.done })}
                className="shrink-0 text-muted-foreground hover:text-green-500 transition-colors"
                aria-label={a.done ? "Als offen markieren" : "Als erledigt markieren"}
              >
                {a.done ? (
                  <CheckSquare className="w-5 h-5 text-green-500" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wide shrink-0",
                      ACT_CLASS[a.type] ?? "text-muted-foreground"
                    )}
                  >
                    {ACT_TYPES[a.type] ?? a.type}
                  </span>
                  {cust && (
                    <span className="text-[11px] text-muted-foreground font-semibold truncate max-w-[160px]">
                      {cust.companyName}
                    </span>
                  )}
                  {a.calendarEventId && (
                    <CalendarCheck
                      className="w-3 h-3 text-green-500 shrink-0"
                      title="Im Google Kalender"
                    />
                  )}
                </div>
                <p
                  className={cn(
                    "text-sm text-foreground mt-0.5 truncate",
                    a.done && "line-through text-muted-foreground"
                  )}
                >
                  {a.description}
                </p>
              </div>

              {/* Right side: date + link */}
              <div className="flex items-center gap-2 shrink-0">
                {dateStr && (
                  <div
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full",
                      a.done
                        ? "text-muted-foreground bg-muted/50"
                        : group === "overdue"
                        ? "text-destructive bg-destructive/10"
                        : group === "today"
                        ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40"
                        : "text-muted-foreground bg-muted/50"
                    )}
                  >
                    <Calendar className="w-3 h-3" />
                    {dateStr}
                  </div>
                )}
                {cust && (
                  <Link href={`/customers/${cust.id}`}>
                    <a title={`Zu ${cust.companyName}`}>
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-1 h-10 rounded-full bg-[#FFD100] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">Aufgaben</h1>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {overdueCount} überfällig
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {openCount > 0 ? `${openCount} offen` : "Alles erledigt"}
            {" · "}
            {activities.filter((a) => a.done).length} erledigt
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Status */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Offen</SelectItem>
            <SelectItem value="done">Erledigt</SelectItem>
            <SelectItem value="all">Alle</SelectItem>
          </SelectContent>
        </Select>

        {/* Date */}
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Fälligkeit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Daten</SelectItem>
            <SelectItem value="overdue">Überfällig</SelectItem>
            <SelectItem value="today">Heute</SelectItem>
            <SelectItem value="week">Diese Woche</SelectItem>
            <SelectItem value="later">Später</SelectItem>
            <SelectItem value="none">Kein Datum</SelectItem>
          </SelectContent>
        </Select>

        {/* Customer */}
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Kunde" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kunden</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {presentTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {ACT_TYPES[t] ?? t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 gap-1.5 text-xs text-muted-foreground"
          >
            <X className="w-3 h-3" />
            Filter zurücksetzen
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground font-medium">
          {filtered.length} Aufgabe{filtered.length !== 1 ? "n" : ""}
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-30" />
          {activities.length === 0 ? (
            <>
              <p className="text-sm font-medium">Noch keine Aufgaben</p>
              <p className="text-xs mt-1">
                Füge Aktivitäten über die Kundendetailseite hinzu
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Keine Aufgaben gefunden</p>
              <p className="text-xs mt-1">Passe die Filter an oder setze sie zurück</p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-3 gap-1.5"
              >
                <Filter className="w-3 h-3" />
                Filter zurücksetzen
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <TaskRow key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}
