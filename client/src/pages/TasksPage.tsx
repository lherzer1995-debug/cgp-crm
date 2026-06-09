import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  ListChecks,
  CalendarCheck,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity as ActivityType, Customer } from "@shared/schema";

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

type DueGroup = "overdue" | "today" | "week" | "later" | "none";

function getDueGroup(dueDate?: string | null): DueGroup {
  if (!dueDate) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "week";
  return "later";
}

const GROUP_CONFIG: Record<DueGroup, { label: string; color: string; dot: string }> = {
  overdue: { label: "Überfällig", color: "text-destructive", dot: "bg-destructive" },
  today: { label: "Heute", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  week: { label: "Diese Woche", color: "text-primary", dot: "bg-primary" },
  later: { label: "Später", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  none: { label: "Kein Datum", color: "text-muted-foreground", dot: "bg-muted-foreground/40" },
};

// ── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({
  activity,
  customer,
  onToggle,
  toggling,
}: {
  activity: ActivityType;
  customer?: Customer;
  onToggle: (id: number, done: boolean) => void;
  toggling: boolean;
}) {
  const group = getDueGroup(activity.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = activity.dueDate ? new Date(activity.dueDate) : null;
  const diff = due
    ? Math.round(
        ((due.setHours(0, 0, 0, 0), due.getTime()) - today.getTime()) / 86400000
      )
    : null;

  let dateStr = "";
  if (activity.dueDate) {
    if (diff === 0) dateStr = "Heute";
    else if (diff === 1) dateStr = "Morgen";
    else if (diff === -1) dateStr = "Gestern";
    else
      dateStr = new Date(activity.dueDate).toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
    if (activity.dueTime) dateStr += ` · ${activity.dueTime} Uhr`;
  }

  return (
    <Card className={cn("transition-all", activity.done && "opacity-50")}>
      <CardContent className="p-0">
        <div className="flex items-stretch">
          {/* Urgency stripe */}
          <div
            className={cn(
              "w-1 rounded-l-lg shrink-0",
              activity.done
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
            {/* Checkbox */}
            <button
              onClick={() => onToggle(activity.id, !activity.done)}
              disabled={toggling}
              className="shrink-0 text-muted-foreground hover:text-green-500 transition-colors disabled:opacity-50"
              aria-label={activity.done ? "Als offen markieren" : "Als erledigt markieren"}
            >
              {activity.done ? (
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
                    ACT_CLASS[activity.type] ?? "text-muted-foreground"
                  )}
                >
                  {ACT_TYPES[activity.type] ?? activity.type}
                </span>
                {customer && (
                  <span className="text-[11px] text-muted-foreground font-semibold">
                    {customer.companyName}
                  </span>
                )}
                {activity.calendarEventId && (
                  <CalendarCheck
                    className="w-3 h-3 text-green-500 shrink-0"
                    title="Im Google Kalender"
                  />
                )}
              </div>
              <p
                className={cn(
                  "text-sm text-foreground mt-0.5 truncate",
                  activity.done && "line-through text-muted-foreground"
                )}
              >
                {activity.description}
              </p>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 shrink-0">
              {dateStr && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full",
                    activity.done
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
              {customer && (
                <Link href={`/customers/${customer.id}`}>
                  <a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={`${customer.companyName} öffnen`}
                    >
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

// ── Main Page ─────────────────────────────────────────────────────────────────

type StatusFilter = "open" | "done" | "all";
type SortMode = "dueDate" | "customer" | "type";

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("dueDate");

  const { data: activities = [], isLoading: aLoad } = useQuery<ActivityType[]>({
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

    // Status filter
    if (statusFilter === "open") list = list.filter((a) => !a.done);
    else if (statusFilter === "done") list = list.filter((a) => a.done);

    // Customer filter
    if (customerFilter !== "all") {
      list = list.filter((a) => String(a.customerId) === customerFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.description.toLowerCase().includes(q) ||
          (custMap[a.customerId]?.companyName ?? "").toLowerCase().includes(q) ||
          (ACT_TYPES[a.type] ?? a.type).toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortMode === "dueDate") {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate > b.dueDate ? 1 : -1;
      }
      if (sortMode === "customer") {
        const ca = custMap[a.customerId]?.companyName ?? "";
        const cb = custMap[b.customerId]?.companyName ?? "";
        return ca.localeCompare(cb, "de");
      }
      if (sortMode === "type") {
        return (ACT_TYPES[a.type] ?? a.type).localeCompare(
          ACT_TYPES[b.type] ?? b.type,
          "de"
        );
      }
      return 0;
    });

    return list;
  }, [activities, statusFilter, customerFilter, searchQuery, sortMode, custMap]);

  // ── Group by due date (only when sorting by dueDate and showing open tasks) ──

  const useGroups = sortMode === "dueDate" && statusFilter !== "done";

  const groups = useMemo<Record<DueGroup, ActivityType[]>>(() => {
    const g: Record<DueGroup, ActivityType[]> = {
      overdue: [],
      today: [],
      week: [],
      later: [],
      none: [],
    };
    if (useGroups) {
      filtered.forEach((a) => g[getDueGroup(a.dueDate)].push(a));
    }
    return g;
  }, [filtered, useGroups]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const openCount = activities.filter((a) => !a.done).length;
  const overdueCount = activities.filter((a) => {
    if (a.done || !a.dueDate) return false;
    const due = new Date(a.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  // Customers that actually have activities (for filter dropdown)
  const activeCustomerIds = useMemo(
    () => [...new Set(activities.map((a) => a.customerId))],
    [activities]
  );

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-1 h-10 rounded-full bg-[#FFD100] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">Aufgaben</h1>
          <p className="text-sm text-muted-foreground">
            {openCount > 0 ? `${openCount} offen` : "Alles erledigt"}
            {overdueCount > 0 && (
              <span className="text-destructive font-semibold">
                {" "}· {overdueCount} überfällig
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Aufgabe suchen…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-9 w-[130px] text-sm">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Offen</SelectItem>
            <SelectItem value="done">Erledigt</SelectItem>
            <SelectItem value="all">Alle</SelectItem>
          </SelectContent>
        </Select>

        {/* Customer filter */}
        <Select
          value={customerFilter}
          onValueChange={setCustomerFilter}
        >
          <SelectTrigger className="h-9 w-[160px] text-sm">
            <SelectValue placeholder="Alle Kunden" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kunden</SelectItem>
            {activeCustomerIds.map((id) => {
              const c = custMap[id];
              if (!c) return null;
              return (
                <SelectItem key={id} value={String(id)}>
                  {c.companyName}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={sortMode}
          onValueChange={(v) => setSortMode(v as SortMode)}
        >
          <SelectTrigger className="h-9 w-[160px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Nach Fälligkeit</SelectItem>
            <SelectItem value="customer">Nach Kunde</SelectItem>
            <SelectItem value="type">Nach Typ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {aLoad ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {activities.length === 0
              ? "Noch keine Aufgaben"
              : "Keine Aufgaben für diese Filter"}
          </p>
          <p className="text-xs mt-1">
            {activities.length === 0
              ? "Füge Aktivitäten über die Kundendetailseite hinzu"
              : "Filter anpassen oder zurücksetzen"}
          </p>
        </div>
      ) : useGroups ? (
        /* Grouped view (by due date) */
        <div className="space-y-5">
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
                {group.map((a) => (
                  <TaskRow
                    key={a.id}
                    activity={a}
                    customer={custMap[a.customerId]}
                    onToggle={(id, done) => toggle.mutate({ id, done })}
                    toggling={toggle.isPending}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat list view */
        <div className="space-y-2">
          {filtered.map((a) => (
            <TaskRow
              key={a.id}
              activity={a}
              customer={custMap[a.customerId]}
              onToggle={(id, done) => toggle.mutate({ id, done })}
              toggling={toggle.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
